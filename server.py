"""交易看板原型：本地服务端（只用 Python 标准库，无需 pip 安装）。

运行：python server.py   然后浏览器打开 http://127.0.0.1:8765

代码约定：
  A 股 / 港股：腾讯代码，如 sh600519、sz000001、bj430047、hk00700
  美股 / 全球指数 / 其他：雅虎代码加前缀 yf:，如 yf:AAPL、yf:^N225、yf:GC=F
"""
import calendar
import json
import os
import re
import sys
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from concurrent.futures import TimeoutError as FutureTimeout
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# 版本戳：每次发版改这里。顶栏会显示，桌面启动器也用它判断后台跑的是不是旧版本
VERSION = "0.7.0"
BUILD = "2026-11-10 12:50"

PORT = int(os.environ.get("BOARD_PORT", "8765"))
ROOT = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"
POOL = ThreadPoolExecutor(max_workers=32)

_cache = {}
_cache_lock = threading.Lock()


def cached(key, ttl, fn):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    val = fn()
    with _cache_lock:
        _cache[key] = (now, val)
    return val


def http_get(url, referer=None, encoding="utf-8", timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    if referer:
        req.add_header("Referer", referer)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode(encoding, errors="replace")


def fnum(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


# ---------------- 腾讯：A 股 / 港股实时行情 ----------------
def tencent_quotes(codes):
    out = {}
    if not codes:
        return out
    for i in range(0, len(codes), 60):
        batch = codes[i:i + 60]
        text = http_get("https://qt.gtimg.cn/q=" + ",".join(batch), encoding="gbk")
        for m in re.finditer(r'v_(\w+)="([^"]*)"', text):
            code, body = m.group(1), m.group(2).split("~")
            if len(body) < 35:
                continue
            price, prev = fnum(body[3]), fnum(body[4])
            chg = price - prev if price is not None and prev else None
            ts = body[30]
            if re.fullmatch(r"\d{14}", ts):
                ts = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]} {ts[8:10]}:{ts[10:12]}:{ts[12:14]}"
            out[code] = {
                "symbol": code,
                "name": body[1],
                "price": price,
                "prevClose": prev,
                "open": fnum(body[5]),
                "high": fnum(body[33]),
                "low": fnum(body[34]),
                "change": chg,
                "pct": (chg / prev * 100) if chg is not None else None,
                "volume": fnum(body[6]),
                "time": ts,
                "source": "腾讯",
            }
            # 场内基金：腾讯第 77/78/81 项分别是 溢价率%、实时 IOPV（参考净值）、上一交易日单位净值
            if len(body) > 81 and body[61] in ("ETF", "LOF"):
                q = out[code]
                q["fundType"] = body[61]
                q["iopv"] = fnum(body[78]) or None
                q["nav"] = fnum(body[81]) or None
                prem = fnum(body[77]) if body[77].strip() else None
                if prem is None and price and (q["iopv"] or q["nav"]):
                    prem = (price / (q["iopv"] or q["nav"]) - 1) * 100
                q["premium"] = prem
    return out


# ---------------- 雅虎：美股 / 全球指数 ----------------
def yahoo_chart(sym, rng, interval, prepost=False, period1=None, period2=None):
    win = f"period1={int(period1)}&period2={int(period2)}" if period1 else f"range={rng}"
    path = (f"/v8/finance/chart/{urllib.parse.quote(sym)}"
            f"?{win}&interval={interval}&includePrePost={'true' if prepost else 'false'}")
    try:
        data = json.loads(http_get("https://query1.finance.yahoo.com" + path, timeout=6))
    except Exception:  # noqa: BLE001  query1 偶尔限流，换 query2
        data = json.loads(http_get("https://query2.finance.yahoo.com" + path, timeout=6))
    res = (data.get("chart") or {}).get("result") or []
    if not res:
        raise ValueError(f"雅虎无数据: {sym}")
    return res[0]


def yahoo_quote(sym):
    r = cached(("yq", sym), 5, lambda: yahoo_chart(sym, "1d", "1m", prepost=True))
    meta = r["meta"]
    price = meta.get("regularMarketPrice")
    prev = meta.get("previousClose") or meta.get("chartPreviousClose")
    chg = price - prev if price is not None and prev else None
    t = meta.get("regularMarketTime")
    q = {
        "symbol": "yf:" + sym,
        "name": meta.get("shortName") or meta.get("longName") or sym,
        "price": price,
        "prevClose": prev,
        "open": None,
        "high": meta.get("regularMarketDayHigh"),
        "low": meta.get("regularMarketDayLow"),
        "change": chg,
        "pct": (chg / prev * 100) if chg is not None else None,
        "volume": meta.get("regularMarketVolume"),
        "time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t)) if t else "",
        "currency": meta.get("currency"),
        "type": meta.get("instrumentType"),
        "source": "雅虎",
    }
    # 美股盘前 / 盘后：取常规交易时段之后的最后一笔成交
    if meta.get("hasPrePostMarketData") and price:
        ts = r.get("timestamp") or []
        closes = ((r.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
        last = next(((ts[i], closes[i]) for i in range(min(len(ts), len(closes)) - 1, -1, -1)
                     if closes[i] is not None), None)
        if last and t and last[0] > t + 60:
            pre = (meta.get("currentTradingPeriod") or {}).get("pre") or {}
            label = "盘前" if pre.get("start", 0) <= last[0] < pre.get("end", 0) else "盘后"
            echg = last[1] - price
            q["ext"] = {"label": label, "price": last[1], "change": echg, "pct": echg / price * 100,
                        "time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(last[0]))}
    return q


def em_hk_quotes(codes):
    """港股实时行情（东方财富，比腾讯的 15 分钟延时更及时）。"""
    sid2code = {}
    for c in codes:
        sids = em_secids(c)
        if sids:
            sid2code[sids[0]] = c
    if not sid2code:
        return {}
    data = em_get("/api/qt/ulist.np/get", {
        "fltt": 2, "secids": ",".join(sid2code),
        "fields": "f2,f3,f4,f5,f12,f13,f14,f15,f16,f17,f18,f124"}, tries=2)
    out = {}
    for it in (data or {}).get("diff") or []:
        code = sid2code.get(f"{it.get('f13')}.{it.get('f12')}")
        if not code or not isinstance(it.get("f2"), (int, float)):
            continue
        t = it.get("f124")
        out[code] = {
            "symbol": code, "name": it.get("f14"), "price": it["f2"], "prevClose": fnum(it.get("f18")),
            "open": fnum(it.get("f17")), "high": fnum(it.get("f15")), "low": fnum(it.get("f16")),
            "change": fnum(it.get("f4")), "pct": fnum(it.get("f3")), "volume": fnum(it.get("f5")),
            "time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t)) if t else "",
            "source": "东方财富",
        }
    return out


def get_quotes(symbols):
    tc = [s for s in symbols if not s.startswith("yf:")]
    yf = [s[3:] for s in symbols if s.startswith("yf:")]
    out = {}
    fut_t = POOL.submit(tencent_quotes, tc)
    futs = {s: POOL.submit(yahoo_quote, s) for s in yf}
    hk = [s for s in tc if s.startswith("hk")]
    fut_hk = POOL.submit(em_hk_quotes, hk) if hk else None
    try:
        out.update(fut_t.result())
    except Exception as e:  # noqa: BLE001
        print("腾讯行情失败:", e, file=sys.stderr)
    if fut_hk:
        try:
            out.update(fut_hk.result())  # 港股用东财实时价覆盖腾讯延时价
        except Exception as e:  # noqa: BLE001
            print("东财港股行情失败，沿用腾讯延时价:", e, file=sys.stderr)
    for s, f in futs.items():
        try:
            out["yf:" + s] = f.result()
        except Exception as e:  # noqa: BLE001
            out["yf:" + s] = {"symbol": "yf:" + s, "name": s, "error": str(e)}
    return out


# ---------------- K 线 ----------------
HK_INDEX = {"hkHSI": "^HSI", "hkHSCEI": "^HSCE", "hkHSTECH": "HSTECH.HK"}


def hk_to_yahoo(code):  # hk00700 -> 0700.HK
    if code in HK_INDEX:
        return HK_INDEX[code]
    return f"{int(code[2:]):04d}.HK"


def a_to_yahoo(code):  # sh600519 -> 600519.SS
    return code[2:] + {"sh": ".SS", "sz": ".SZ", "bj": ".BJ"}[code[:2]]


# ---------------- 东方财富：K 线主数据源（A 股 / 港股 / 美股 / 全球指数，含分钟线） ----------------
EM_REF = "https://quote.eastmoney.com/"
EM_KLT = {"m1": 1, "m5": 5, "m15": 15, "m30": 30, "m60": 60, "day": 101, "week": 102, "month": 103}
EM_INDEX = {"^DJI": "100.DJIA", "^IXIC": "100.NDX", "^GSPC": "100.SPX", "^N225": "100.N225",
            "^KS11": "100.KS11", "^GDAXI": "100.GDAXI", "^FTSE": "100.FTSE", "^HSI": "100.HSI",
            "^FCHI": "100.FCHI", "^STOXX50E": "100.SX5E", "^TWII": "100.TWII", "^BSESN": "100.SENSEX"}
EM_HK_INDEX = {"hkHSI": "100.HSI", "hkHSCEI": "100.HSCEI", "hkHSTECH": "124.HSTECH"}
_em_us_market = {}  # AAPL -> 105/106/107，首次查询后缓存


def em_get(path, params, tries=2):
    url = "https://push2his.eastmoney.com" + path + "?" + urllib.parse.urlencode(params)
    last = None
    for i in range(tries):
        try:
            d = json.loads(http_get(url, referer=EM_REF, timeout=4))
            return d.get("data")
        except Exception as e:  # noqa: BLE001  东财偶发断连，重试
            last = e
            time.sleep(0.2 * (i + 1))
    raise last


def em_secids(symbol):
    """返回候选 secid 列表；返回空列表表示东财不支持（交给雅虎）。"""
    if symbol[:2] == "sh":
        return ["1." + symbol[2:]]
    if symbol[:2] in ("sz", "bj"):
        return ["0." + symbol[2:]]
    if symbol in EM_HK_INDEX:
        return [EM_HK_INDEX[symbol]]
    if symbol.startswith("hk"):
        return ["116." + symbol[2:]]
    if symbol.startswith("yf:"):
        y = symbol[3:]
        if y in EM_INDEX:
            return [EM_INDEX[y]]
        if re.fullmatch(r"[A-Z]+(-[A-Z])?", y):  # 美股个股
            code = y.replace("-", "_")
            if code in _em_us_market:
                return [f"{_em_us_market[code]}.{code}"]
            return [f"{m}.{code}" for m in (105, 106, 107)]
    return []


def bj_ts(text):
    """东财时间是北京时间字符串；按"显示时间"转成秒数，图表横轴直接显示北京时间。"""
    return calendar.timegm(time.strptime(text, "%Y-%m-%d %H:%M"))


def em_kline(symbol, period, end=None):
    """end: YYYYMMDD，取该日（含）之前的历史，用于图表往左拖时加载更早数据。"""
    for sid in em_secids(symbol):
        if period in ("min", "m1"):  # 1 分钟 K 与分时同源：最近 5 个交易日
            data = em_get("/api/qt/stock/trends2/get", {
                "secid": sid, "fields1": "f1,f2,f3,f4,f5,f6,f7,f8",
                "fields2": "f51,f52,f53,f54,f55,f56,f57,f58", "ndays": 5, "iscr": 0})  # 最近 5 个交易日，缩小即可接上前几日
            if not data or not data.get("trends"):
                continue
            bars = []
            for row in data["trends"]:
                f = row.split(",")
                o, c, h, lo = float(f[1]), float(f[2]), float(f[3]), float(f[4])
                if o <= 0:  # 历史日的分时数据没有开盘价，用上一分钟收盘价代替
                    o = bars[-1]["close"] if bars else c
                h, lo = max(h, o, c), min(x for x in (lo, o, c) if x > 0)
                bars.append({"time": bj_ts(f[0]), "value": c, "open": o, "high": h, "low": lo, "close": c,
                             "volume": float(f[5]), "avg": fnum(f[7])})
            return {"type": "line" if period == "min" else "candle", "bars": bars,
                    "prevClose": data.get("preClose"), "source": "东方财富"}
        data = em_get("/api/qt/stock/kline/get", {
            "secid": sid, "klt": EM_KLT[period], "fqt": 1, "end": end or "20500101",
            "lmt": 1000 if period.startswith("m") else 800,
            "fields1": "f1,f2,f3", "fields2": "f51,f52,f53,f54,f55,f56"})
        if not data or not data.get("klines"):
            continue
        if sid.split(".")[0] in ("105", "106", "107"):
            _em_us_market[sid.split(".")[1]] = sid.split(".")[0]
        bars = []
        for row in data["klines"]:
            f = row.split(",")
            t = bj_ts(f[0]) if " " in f[0] else f[0]
            bars.append({"time": t, "open": float(f[1]), "close": float(f[2]), "high": float(f[3]),
                         "low": float(f[4]), "volume": float(f[5])})
        return {"type": "candle", "bars": bars, "source": "东方财富"}
    raise ValueError("东方财富无数据")


def fallback_kline(symbol, period):
    errors = []
    if symbol.startswith(("sh", "sz", "bj")) and not period.startswith("m"):
        try:
            return tencent_kline(symbol, period)
        except Exception as e:  # noqa: BLE001
            errors.append(f"腾讯:{e}")
    try:
        return yahoo_kline(to_yahoo_symbol(symbol), period)
    except Exception as e:  # noqa: BLE001
        errors.append(f"雅虎:{e}")
        raise ValueError("；".join(errors)) from e


def spark(symbol):
    """自选列表里的日内走势小图：最近一个交易日的分时，压缩到 ≤80 个点。缓存 60 秒。"""
    def build():
        d = kline(symbol, "min")
        bars = d.get("bars") or []
        if not bars:
            return None
        def day(t):
            return time.strftime("%Y-%m-%d", time.gmtime(t)) if isinstance(t, (int, float)) else str(t)[:10]
        last = day(bars[-1]["time"])
        today = [b for b in bars if day(b["time"]) == last]
        vals = [b.get("value", b.get("close")) for b in today]
        vals = [v for v in vals if v is not None]
        step = max(1, -(-len(vals) // 60))
        pts = vals[::step]
        if vals and pts[-1] != vals[-1]:
            pts.append(vals[-1])
        prev = d.get("prevClose")
        if not prev:  # 没给昨收：取上一交易日最后一笔
            older = [b for b in bars if day(b["time"]) < last]
            if older:
                prev = older[-1].get("value", older[-1].get("close"))
        return {"pts": [round(v, 4) for v in pts], "prev": prev, "day": last}
    return cached("spark:" + symbol, 60, build)


def sparks(symbols):
    futs = {s: POOL.submit(spark, s) for s in symbols[:80]}
    out = {}
    for s, f in futs.items():
        try:
            out[s] = f.result(timeout=12)
        except Exception:  # noqa: BLE001
            out[s] = None
    return out


def kline(symbol, period):
    """period: min(分时) / m1 m5 m15 m30 m60（分钟K）/ day / week / month。
    先请求东方财富；1.5 秒内没回来就同时请求备用源（腾讯 / 雅虎），谁先成功用谁。"""
    if period not in EM_KLT and period != "min":
        raise ValueError("不支持的周期: " + period)
    if not em_secids(symbol):
        return fallback_kline(symbol, period)
    primary = POOL.submit(em_kline, symbol, period)
    try:
        return primary.result(timeout=1.5)
    except FutureTimeout:
        pass
    except Exception:  # noqa: BLE001
        return fallback_kline(symbol, period)
    backup = POOL.submit(fallback_kline, symbol, period)
    pending, last_err = {primary, backup}, None
    while pending:
        done, pending = wait(pending, return_when=FIRST_COMPLETED)
        for f in done:
            try:
                return f.result()
            except Exception as e:  # noqa: BLE001
                last_err = e
    raise last_err


def tencent_kline(symbol, period):
    if period == "min":
        d = json.loads(http_get(f"https://web.ifzq.gtimg.cn/appstock/app/minute/query?code={symbol}"))
        node = d["data"][symbol]["data"]
        date = node.get("date") or time.strftime("%Y%m%d")
        bars, last_vol = [], 0.0
        for row in node["data"]:
            hhmm, price, cumvol = row.split()[:3]
            # 按"显示时间"转成 UTC 秒数，图表横轴直接显示北京时间，不受本机时区影响
            ts = calendar.timegm(time.strptime(date + hhmm, "%Y%m%d%H%M"))
            vol = float(cumvol) - last_vol
            last_vol = float(cumvol)
            pv = float(price)
            bars.append({"time": int(ts), "value": pv, "open": pv, "high": pv, "low": pv, "close": pv,
                         "volume": max(vol, 0)})
        return {"type": "line", "bars": bars}
    d = json.loads(http_get(
        f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={symbol},{period},,,640,qfq"))
    node = d["data"][symbol]
    rows = node.get("qfq" + period) or node.get(period) or []
    bars = [{"time": r[0], "open": float(r[1]), "close": float(r[2]), "high": float(r[3]),
             "low": float(r[4]), "volume": float(r[5])} for r in rows]
    if not bars:
        raise ValueError("腾讯K线为空")
    return {"type": "candle", "bars": bars, "source": "腾讯"}


YF_IV = {"min": ("5d", "1m"), "m1": ("5d", "1m"), "m5": ("1mo", "5m"), "m15": ("1mo", "15m"),
         "m30": ("1mo", "30m"), "m60": ("6mo", "60m"), "day": ("2y", "1d"), "week": ("10y", "1wk"),
         "month": ("max", "1mo")}
BJ_OFF = 8 * 3600  # 分钟级数据统一按北京时间显示（东方财富的美股分钟线也是北京时间），保证能前后拼接


def yahoo_kline(ysym, period, period1=None, period2=None):
    rng, iv = YF_IV[period]
    r = yahoo_chart(ysym, rng, iv, period1=period1, period2=period2)
    ts = r.get("timestamp") or []
    q = (r.get("indicators") or {}).get("quote", [{}])[0]
    off = r["meta"].get("gmtoffset", 0)
    intraday = period == "min" or period.startswith("m")
    bars = []
    for i, t in enumerate(ts):
        o, h, l, c, v = (q.get(k, [None] * len(ts))[i] for k in ("open", "high", "low", "close", "volume"))
        if c is None:
            continue
        o = o if o is not None else c
        h = h if h is not None else c
        l = l if l is not None else c
        if intraday:
            b = {"time": t + BJ_OFF, "open": o, "high": h, "low": l, "close": c, "volume": v or 0}
            if period == "min":
                b["value"] = c
        else:
            b = {"time": time.strftime("%Y-%m-%d", time.gmtime(t + off)), "open": o, "high": h, "low": l,
                 "close": c, "volume": v or 0}
        bars.append(b)
    dedup = {}
    for b in bars:  # 去重（雅虎偶尔给同一时间两条）
        dedup[b["time"]] = b
    bars = sorted(dedup.values(), key=lambda b: b["time"])
    return {"type": "line" if period == "min" else "candle", "bars": bars, "source": "雅虎"}


def to_yahoo_symbol(symbol):
    if symbol.startswith(("sh", "sz", "bj")):
        return a_to_yahoo(symbol)
    if symbol.startswith("hk"):
        return hk_to_yahoo(symbol)
    return symbol[3:]


# 雅虎各周期能回溯的窗口（天）：1 分钟只保留最近 30 天、每次最多 7 天；5–30 分钟 60 天；60 分钟 730 天
YF_SPAN = {"min": 7, "m1": 7, "m5": 55, "m15": 55, "m30": 55, "m60": 700}


def older_kline(symbol, period, before):
    """图表往左拖到头时加载更早的数据。before 是当前最早一根的时间（分钟级为北京时间秒数，日线为日期）。
    先用东方财富（日线可到上市首日；5–60 分钟线约两个月），不够再用雅虎（1 分钟约 30 天、60 分钟约两年）。"""
    if isinstance(before, str):
        end = before.replace("-", "")
    else:
        end = time.strftime("%Y%m%d", time.gmtime(before))
    bars = []
    if period not in ("min", "m1"):
        try:
            bars = [b for b in em_kline(symbol, period, end)["bars"] if b["time"] < before]
        except Exception:  # noqa: BLE001
            bars = []
    if not bars and period in YF_SPAN and not isinstance(before, str):
        real_end = before - BJ_OFF
        # 雅虎只保留最近一段时间的分钟数据，起点不能早于这个界限，否则整段请求会失败
        limit = {"min": 29, "m1": 29, "m60": 729}.get(period, 59)
        start = max(real_end - YF_SPAN[period] * 86400, time.time() - limit * 86400 + 3600)
        try:
            if start >= real_end:
                raise ValueError("超出雅虎可回溯范围")
            d = yahoo_kline(to_yahoo_symbol(symbol), period, period1=start, period2=real_end)
            bars = [b for b in d["bars"] if b["time"] < before]
        except Exception:  # noqa: BLE001
            bars = []
    return {"type": "line" if period == "min" else "candle", "bars": bars}


# ---------------- 搜索（腾讯智能提示） ----------------
def search(q):
    text = http_get("https://smartbox.gtimg.cn/s3/?v=2&t=all&q=" + urllib.parse.quote(q),
                    encoding="utf-8")
    m = re.search(r'v_hint="([^"]*)"', text)
    out = []
    if not m or not m.group(1) or m.group(1) == "N":
        return out
    for item in m.group(1).split("^"):
        f = item.split("~")
        if len(f) < 3:
            continue
        mkt, code, name = f[0], f[1], f[2].encode().decode("unicode_escape", errors="ignore")
        if mkt in ("sh", "sz", "bj"):
            out.append({"symbol": mkt + code, "name": name})
        elif mkt == "hk":
            out.append({"symbol": "hk" + code, "name": name})
        elif mkt == "us":
            out.append({"symbol": "yf:" + code.split(".")[0].upper(), "name": name})
    return out[:10]


# ---------------- 扩展模块（各自一个文件，互不冲突） ----------------
# news.py 由"资讯"子任务负责：需提供 handle(qs: dict) -> 可 JSON 序列化的对象
try:
    import news  # noqa: E402
except ImportError:
    news = None
try:
    import updater  # noqa: E402
except ImportError:
    updater = None


def restart_command():
    """更新后用来启动新版本的命令：沿用当前入口（desktop.py 或 server.py）。"""
    entry = os.path.abspath(sys.argv[0])
    exe = sys.executable
    if os.name == "nt" and os.path.basename(entry).lower() == "desktop.py":
        w = os.path.join(os.path.dirname(exe), "pythonw.exe")
        exe = w if os.path.exists(w) else exe
    args = [a for a in sys.argv[1:]]
    if os.path.basename(entry).lower() == "server.py" and "--no-browser" not in args:
        args.append("--no-browser")  # 浏览器版：旧页面会自己刷新，不再新开标签页
    return [exe, entry] + args


# ---------------- HTTP 服务 ----------------
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=os.path.join(ROOT, "static"), **kw)

    def log_message(self, fmt, *args):
        pass

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # 静态文件不让 WebView 缓存，更新后重开即生效
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_POST(self):
        # 新版本启动时请求旧版本退出（只接受本机请求）
        path = urllib.parse.urlparse(self.path).path
        if self.client_address[0] != "127.0.0.1":
            return self.send_json({"error": "forbidden"}, 403)
        if path == "/api/shutdown":
            self.send_json({"ok": True, "version": VERSION})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            # 整个进程退出（桌面版连同旧窗口一起关掉），让新版本接管
            threading.Timer(0.6, lambda: os._exit(0)).start()
            return
        if path == "/api/update/apply":
            if updater is None:
                return self.send_json({"error": "updater 不可用"}, 501)
            try:
                ok = updater.start_update(restart_command())
            except Exception as e:  # noqa: BLE001
                return self.send_json({"error": f"检查更新失败：{e}"}, 502)
            return self.send_json({"ok": ok, **updater.status()})
        self.send_json({"error": "not found"}, 404)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        if u.path == "/api/version":
            return self.send_json({"version": VERSION, "build": BUILD, "pid": os.getpid()})
        if u.path == "/api/update/check":
            if updater is None:
                return self.send_json({"error": "updater 不可用"}, 501)
            try:
                return self.send_json(updater.check(VERSION, force=qs.get("force", ["0"])[0] == "1"))
            except Exception as e:  # noqa: BLE001
                return self.send_json({"error": f"检查更新失败：{e}"}, 502)
        if u.path == "/api/update/status":
            return self.send_json(updater.status() if updater else {"status": "error", "message": "updater 不可用"})
        try:
            if u.path == "/api/quotes":
                syms = [s for s in (qs.get("s", [""])[0]).split(",") if s]
                return self.send_json(get_quotes(syms))
            if u.path == "/api/spark":
                syms = [x for x in (qs.get("s", [""])[0]).split(",") if x]
                return self.send_json(sparks(syms))
            if u.path == "/api/kline":
                s, p = qs["s"][0], qs.get("p", ["day"])[0]
                before = qs.get("before", [""])[0]
                if before:  # 往左拖时加载更早历史
                    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", before):
                        bv = before
                    elif re.fullmatch(r"\d{9,11}", before):
                        bv = int(before)
                    else:
                        return self.send_json({"error": "bad before"}, 400)
                    return self.send_json(cached(("k", s, p, before), 300, lambda: older_kline(s, p, bv)))
                ttl = 10 if p.startswith("m") else 60
                return self.send_json(cached(("k", s, p), ttl, lambda: kline(s, p)))
            if u.path == "/api/news":
                if news is None:
                    return self.send_json({"error": "news.py 尚未就绪"}, 501)
                return self.send_json(news.handle(qs))
            if u.path == "/api/search":
                return self.send_json(search(qs.get("q", [""])[0]))
        except Exception as e:  # noqa: BLE001
            return self.send_json({"error": str(e)}, 502)
        if u.path == "/":
            self.path = "/index.html"
        return super().do_GET()


def take_over_port():
    """端口上如果是别的版本的看板，请它退出（更新后重启、或用户重复打开时）。"""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/version", timeout=1) as r:
            v = json.loads(r.read().decode("utf-8")).get("version")
    except Exception:  # noqa: BLE001
        return
    if v == VERSION:
        return
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{PORT}/api/shutdown", data=b"", method="POST")
        urllib.request.urlopen(req, timeout=2).read()
    except Exception:  # noqa: BLE001
        pass
    for _ in range(40):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/version", timeout=0.3)
            time.sleep(0.1)
        except Exception:  # noqa: BLE001
            return


def main():
    take_over_port()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://127.0.0.1:{PORT}"
    print(f"交易看板 v{VERSION}（{BUILD}）已启动：{url}  （Ctrl+C 退出）")
    if "--no-browser" not in sys.argv:
        import webbrowser
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
