"""Cross-border ETF returns at a common completed Beijing minute."""
import time
from concurrent.futures import ThreadPoolExecutor

from etf_peers import catalog
from session_compare import BJ, FUTURES, valid


# The quote currency describes the actual overseas reference, not the ETF's listing currency.
# US cash indices are closed in the Beijing daytime. These index futures are labeled proxies.
REFERENCES = {
    "NDX": (FUTURES["NQ"], "纳斯达克 100 期货", "USD", True),
    "SPX": (FUTURES["ES"], "标普 500 期货", "USD", True),
    "HSI": ("^HSI", "恒生指数", "HKD", False),
    "HSCEI": ("^HSCE", "恒生国企指数", "HKD", False),
    "HSTECH": ("HSTECH.HK", "恒生科技指数", "HKD", False),
    "HSHKBIO": ("3069.HK", "恒生生物科技指数 ETF", "HKD", True),
    "N225": ("^N225", "日经 225 指数", "JPY", False),
    "TOPIX": ("1306.T", "东证指数 ETF", "JPY", True),
    "DAX": ("^GDAXI", "德国 DAX 指数", "EUR", False),
    "CAC40": ("^FCHI", "法国 CAC 40 指数", "EUR", False),
    "profile:标普生物科技精选行业": ("XBI", "标普生物科技精选行业 ETF", "USD", True),
}
FX = {"USD": "CNY=X", "HKD": "HKDCNY=X", "JPY": "JPYCNY=X", "EUR": "EURCNY=X"}
DATA_ERRORS = (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError)


def local_session(symbol, sources, now):
    latest = (None, {}, None)
    for fetch in sources:
        try:
            result = fetch(symbol, "min")
            bars = result["bars"]
            trades = [b for b in bars if valid(b.get("volume")) and valid(b.get("value"))
                      and b["time"] <= now + BJ]
            if not trades:
                continue
            midnight = int(max(b["time"] for b in trades) // 86400 * 86400)
            start = midnight + 570 * 60
            prices = {b["time"]: b["value"] for b in trades
                      if start <= b["time"] <= midnight + 690 * 60
                      or midnight + 780 * 60 < b["time"] <= midnight + 900 * 60}
            # Eastmoney timestamps the first completed bar at 09:31. Its raw
            # opening trade can anchor 09:30 when there is no explicit 09:30 trade.
            if start not in prices:
                first = next((b for b in trades if b["time"] == start + 60), {})
                if valid(first.get("observedOpen")):
                    prices[start] = first["observedOpen"]
            if latest[0] is None or midnight > latest[0] or (midnight == latest[0] and start in prices):
                latest = (midnight, prices, result.get("source"))
            if midnight == int((now + BJ) // 86400 * 86400) and start in prices:
                break
        except DATA_ERRORS:
            continue
    return latest


def foreign_session(ticker, start, cutoff, yahoo):
    result = yahoo(ticker, "5d", "1m", False)
    quote = result["indicators"]["quote"][0]
    points = {}
    for t, opened, close in zip(result.get("timestamp", ()), quote["open"], quote["close"]):
        if not isinstance(t, int) or t % 60:
            continue
        t += BJ
        if t == start and valid(opened):
            points[start] = opened
        if start <= t < cutoff and t + 60 <= cutoff and valid(close):
            points[t + 60] = close
    return points


def currency_for(group, ref):
    if ref:
        return ref[2]
    if group["market"] == "跨境 · 美国":
        return "USD"
    # Mixed A/H baskets and indices already expressed in CNY have no single
    # clean FX leg. Use HKD only for explicitly HKD-denominated catalogue indices.
    if "港元" in group["index"] or "港币" in group["index"]:
        return "HKD"
    return None


def stamp(t):
    return time.strftime("%Y-%m-%d %H:%M", time.gmtime(t))


def compare(symbol, cached, domestic_minutes, backup_minutes, yahoo):
    groups, _ = catalog()
    group = groups.get(symbol)
    if not group or "跨境" not in group["market"]:
        return {"crossBorder": False}
    ref = REFERENCES.get(group["key"])
    currency = currency_for(group, ref)
    now = time.time()
    midnight, local, source = cached(("etf-session", symbol), 20,
        lambda: local_session(symbol, (domestic_minutes, backup_minutes), now))
    rows = [
        {"key": "etf", "name": "ETF 场内", "source": source, "pct": None},
        {"key": "benchmark", "name": ref[1] if ref else "跟踪基准", "pct": None,
         "proxy": bool(ref and ref[3]), "ticker": ref[0] if ref else None,
         "source": "Yahoo Finance" if ref else None},
        {"key": "fx", "name": f"{currency}/CNY" if currency else "人民币汇率", "pct": None,
         "source": "Yahoo Finance" if currency else None},
    ]
    result = {"crossBorder": True, "rows": rows}
    if midnight is None:
        return dict(result, message="暂无 ETF 分时成交")
    start = midnight + 570 * 60
    result["start"] = stamp(start)
    if start not in local:
        return dict(result, message="缺少 ETF 09:30 开盘成交基准")
    cutoff = min(int(now + BJ) // 60 * 60, max(local))

    def load(ticker):
        if not ticker:
            return {}
        try:
            # Cache provider bars through the current completed minute, independently of fund.
            finish = min(int(now + BJ) // 60 * 60, midnight + 900 * 60)
            return cached(("etf-foreign", ticker, start), 20,
                          lambda: foreign_session(ticker, start, finish, yahoo))
        except DATA_ERRORS:
            return {}

    with ThreadPoolExecutor(max_workers=2) as pool:
        overseas, fx = pool.map(load, (ref[0] if ref else None, FX.get(currency)))
    common = {t for t in local if start < t <= cutoff}
    usable = [local]
    for series in (overseas, fx):
        if start in series and common.intersection(series):
            usable.append(series)
    endpoint = max(common.intersection(*(series.keys() for series in usable)), default=None)
    if endpoint is None and common:
        endpoint = max(common)
    if endpoint is None:
        return dict(result, message="暂无共同完成的分钟")

    result["end"] = stamp(endpoint)
    ratios = {}
    for row, series in zip(rows, (local, overseas, fx)):
        if start in series and endpoint in series:
            ratio = series[endpoint] / series[start]
            ratios[row["key"]] = ratio
            row["pct"] = (ratio - 1) * 100
            row["time"] = result["end"]
        elif not row["source"]:
            row["status"] = "暂无适用序列"
        elif start not in series:
            row["status"] = "缺少 09:30 数据"
        else:
            row["status"] = "缺少同期数据"
    if len(ratios) == 3:
        converted = ratios["benchmark"] * ratios["fx"]
        rows.extend((
            {"key": "converted", "name": "基准折算人民币", "pct": (converted - 1) * 100},
            {"key": "difference", "name": "ETF 相对基准偏离", "pct": (ratios["etf"] / converted - 1) * 100},
        ))
    return result
