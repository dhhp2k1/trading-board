"""申万二级行业指数成分及同日相对强弱。

用 python industry_strength.py --refresh-data 从申万宏源研究重建本地成分。
申万站点未随叶证书发送中间证书，sw_intermediate.pem 补全证书链，
不替代系统根证书，TLS 主机名和证书校验仍启用。
中间证书来源为叶证书的 DigiCert AIA
http://cacerts.digicert.cn/GeoTrustG2TLSCNRSA4096SHA2562022CA1.crt
DER SHA-256 为
05dc9edc0fddfa975a1432ef806ec780078b5362ad45af76db15c907630db25d。
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import json
import math
from pathlib import Path
import re
import ssl
import statistics
import threading
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

CLASSIFICATION = "申万二级"
SW_BASE = "https://www.swsresearch.com/institute-sw/api/index_publish/"
SW_SITE = "https://www.swsresearch.com/institute_sw/allIndex/releasedIndex"
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "industry_members.json"
CHINA = timezone(timedelta(hours=8))
SOURCE = "申万宏源研究（行业指数及成分） · 腾讯（个股行情）"
_cache = {}
_lock = threading.Lock()
_flights = {}


@lru_cache(maxsize=1)
def _tls():
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cafile=str(ROOT / "sw_intermediate.pem"))
    return ctx


def _official(path, **params):
    request = Request(SW_BASE + path + "/?" + urlencode(params), headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=8, context=_tls()) as response:
        return json.load(response)["data"]


def _stock_symbol(code):
    if re.fullmatch(r"(?:60|68)\d{4}", code):
        return "sh" + code
    if re.fullmatch(r"(?:00|30)\d{4}", code):
        return "sz" + code
    if re.fullmatch(r"(?:920\d{3}|[48]\d{5})", code):
        return "bj" + code
    raise ValueError("不支持的申万成分股票代码: " + code)


def _catalog_members(item):
    code, name = item["swindexcode"], item["swindexname"]
    reply = _official("details/component_stocks", swindexcode=code, page=1, page_size=10000)
    symbols = sorted({_stock_symbol(row["stockcode"]) for row in reply["results"]})
    if len(symbols) != reply["count"]:
        raise ValueError("行业成分数据不完整: " + code)
    return {"code": code, "name": name, "symbols": symbols}


def refresh_data():
    reply = _official("current", indextype="二级行业", page=1, page_size=300)
    catalog = reply["results"]
    if not catalog or len(catalog) != reply["count"]:
        raise ValueError("申万二级行业目录不完整")
    with ThreadPoolExecutor(max_workers=5) as pool:
        industries = sorted(pool.map(_catalog_members, catalog), key=lambda item: item["code"])
    data = {
        "classification": CLASSIFICATION,
        "snapshotDay": datetime.now(CHINA).date().isoformat(),
        "source": SW_SITE,
        "catalogEndpoint": SW_BASE + "current/",
        "membersEndpoint": SW_BASE + "details/component_stocks/",
        "industries": industries,
    }
    _member_lookup(data)
    temporary = DATA.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    temporary.replace(DATA)
    return len(industries), sum(len(item["symbols"]) for item in industries)


def _member_lookup(data):
    lookup = {}
    for industry in data["industries"]:
        for symbol in industry["symbols"]:
            if symbol in lookup:
                raise ValueError("股票出现在多个二级行业: " + symbol)
            lookup[symbol] = industry
    if not lookup:
        raise ValueError("缺少申万行业成分")
    return lookup


@lru_cache(maxsize=1)
def _members():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    return data["snapshotDay"], _member_lookup(data)


def _finite(value):
    return isinstance(value, (int, float)) and math.isfinite(value)


def _quote_snapshots(symbols, windows, quote_loader):
    data = quote_loader(symbols)
    snapshots = {}
    for symbol in symbols:
        q = data.get(symbol) or {}
        day = q.get("sparkDay")
        if day not in windows or q.get("source") != "腾讯":
            continue
        _, earliest, latest = windows[day]
        if (_finite(q.get("pct")) and _finite(q.get("timestamp")) and earliest <= q["timestamp"] <= latest
                and _finite(q.get("open")) and q["open"] > 0 and _finite(q.get("volume")) and q["volume"] > 0):
            snapshots.setdefault(day, {})[symbol] = (q["pct"], q["timestamp"])
    return snapshots


def _index_timelines(code, windows):
    rows = _official("details/timelines", swindexcode=code)
    dates = {day.replace("-", ""): day for day in windows}
    snapshots = {}
    for row in rows:
        day = dates.get(row.get("trading_date"))
        if not day or row.get("l1") != code:
            continue
        clock = row.get("trading_time") or ""
        if not re.fullmatch(r"\d{2}:[0-5]\d:[0-5]\d", clock):
            continue
        if not ("09:30:00" <= clock <= "11:30:59" or "13:00:00" <= clock <= "15:00:59"):
            continue
        try:
            previous, price = float(row["l3"]), float(row["l8"])
        except (KeyError, ValueError, TypeError):
            continue
        if not (_finite(previous) and previous > 0 and _finite(price) and price > 0):
            continue
        midnight, _, latest = windows[day]
        hour, minute, second = map(int, clock.split(":"))
        stamp = midnight + 3600 * hour + 60 * minute + second
        if stamp <= latest:
            snapshots.setdefault(day, {})[clock] = (stamp, (price / previous - 1) * 100)
    result = {}
    for day, points in snapshots.items():
        last_clock = max(points)
        timestamp, value = points[last_clock]
        if timestamp < windows[day][1]:
            continue
        by_minute = {}
        for clock in sorted(points):
            by_minute[clock[:5]] = {"time": clock[:5], "pct": points[clock][1]}
        result[day] = (value, day + " " + last_clock, list(by_minute.values()))
    return result


def _quote_windows(now):
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    minute = now.hour * 60 + now.minute
    windows = {}
    if now.weekday() < 5 and minute >= 570:
        start, end = (570, 690) if minute < 780 else (780, 900)
        earliest = max((midnight + timedelta(minutes=start)).timestamp(),
                       min(now.timestamp(), (midnight + timedelta(minutes=end)).timestamp()) - 300)
        windows[now.date().isoformat()] = (midnight.timestamp(), earliest, now.timestamp() + 30)
    # 只接受行情源实际返回的交易日，窗口用于排除长时间停牌的旧记录。
    for offset in range(1, 15):
        previous = midnight - timedelta(days=offset)
        if previous.weekday() < 5:
            begin = previous.timestamp()
            windows[previous.date().isoformat()] = (begin, begin + 895 * 60, begin + 86400 - 1)
    return windows


def _snapshot(industry, now, quote_loader):
    windows = _quote_windows(now)
    failures = 0
    with ThreadPoolExecutor(max_workers=1) as pool:
        index_work = pool.submit(_index_timelines, industry["code"], windows)
        try:
            quotes = _quote_snapshots(industry["symbols"], windows, quote_loader)
        except Exception:
            quotes = {}
            failures += 1
        try:
            indices = index_work.result()
        except Exception:
            indices = {}
            failures += 1
    day = max(quotes.keys() | indices.keys(), default=None)
    return day, quotes.get(day, {}), indices.get(day, (None, None, [])), failures == 2


def _cached_snapshot(industry, now, quote_loader):
    minute = now.hour * 60 + now.minute
    # 开盘与切换下午时丢弃上一个时段的快照。
    key = (industry["code"], now.date(), 2 if minute >= 780 else int(minute >= 570))
    with _lock:
        hit = _cache.get(key)
        if hit and time.monotonic() - hit[0] < 20:
            return hit[1]
        gate = _flights.setdefault(key, threading.Lock())
    with gate:
        with _lock:
            hit = _cache.get(key)
            if hit and time.monotonic() - hit[0] < 20:
                return hit[1]
        result = _snapshot(industry, now, quote_loader)
        with _lock:
            for stale in list(_cache):
                if time.monotonic() - _cache[stale][0] >= 20 and stale not in _flights:
                    del _cache[stale]
            _cache[key] = (time.monotonic(), result)
            _flights.pop(key, None)
        return result


def handle(symbol, *, quote_loader, http_get=None):
    """取源端最新可用交易日的行业相对强弱；quote_loader 接受股票代码列表。"""
    result = {
        "classification": CLASSIFICATION, "industry": None, "day": None,
        "stockPct": None, "industryPct": None, "benchmark": None, "rank": None,
        "valid": 0, "total": 0, "up": 0, "time": None, "benchmarkTime": None,
        "timeline": [], "source": SOURCE, "membershipAsOf": None, "historical": False,
    }
    try:
        snapshot_day, members = _members()
    except (OSError, ValueError, KeyError):
        return {**result, "error": "申万行业成分文件暂不可用"}
    industry = members.get(symbol)
    result["membershipAsOf"] = snapshot_day
    if not industry:
        return result
    result["industry"] = {"code": industry["code"], "name": industry["name"]}
    result["total"] = len(industry["symbols"])
    now = datetime.now(CHINA)
    day, quotes, (industry_pct, index_time, timeline), failed = _cached_snapshot(industry, now, quote_loader)
    if not day:
        if failed:
            result["error"] = "行业指数和成分行情暂不可用"
        return result
    values = [item[0] for item in quotes.values()]
    stock_pct, stock_time = quotes.get(symbol, (None, None))
    if industry_pct is not None:
        benchmark = "申万二级行业指数"
    elif values:
        industry_pct = statistics.mean(values)
        benchmark = "有效成分等权"
        index_time = datetime.fromtimestamp(max(item[1] for item in quotes.values()), CHINA).strftime("%Y-%m-%d %H:%M:%S")
    result.update(day=day, historical=day != now.date().isoformat(), stockPct=stock_pct, industryPct=industry_pct,
                  rank=None if stock_pct is None else 1 + sum(pct > stock_pct for pct in values),
                  benchmark=benchmark, valid=len(values), up=sum(pct > 0 for pct in values),
                  time=None if stock_time is None else datetime.fromtimestamp(stock_time, CHINA).strftime("%Y-%m-%d %H:%M:%S"),
                  benchmarkTime=index_time, timeline=timeline)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-data", action="store_true", required=True)
    parser.parse_args()
    industry_count, security_count = refresh_data()
    print(f"{industry_count} industries, {security_count} securities")
