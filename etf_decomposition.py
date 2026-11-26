"""Cross-border ETF opening returns and synchronized comparisons."""
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
    pattern = "%Y-%m-%d %H:%M:%S" if t % 60 else "%Y-%m-%d %H:%M"
    return time.strftime(pattern, time.gmtime(t))


def local_quote(symbol, quotes, now):
    quote = quotes([symbol]).get(symbol, {})
    timestamp = quote.get("timestamp")
    if not valid(timestamp) or timestamp > now or not valid(quote.get("volume")):
        return {}
    observed = int(timestamp) + BJ
    minute = observed % 86400 // 60
    if not (570 <= minute <= 690 or 780 <= minute <= 900):
        return {}
    if not (valid(quote.get("open")) or valid(quote.get("price"))):
        return {}
    return {**quote, "observed": observed}


def compare(symbol, cached, domestic_minutes, backup_minutes, yahoo, quotes=None):
    groups, _ = catalog()
    group = groups.get(symbol)
    if not group or "跨境" not in group["market"]:
        return {"crossBorder": False}
    ref = REFERENCES.get(group["key"])
    currency = currency_for(group, ref)
    now = time.time()
    today = int((now + BJ) // 86400 * 86400)
    midnight, local, source = cached(("etf-session", symbol), 20,
        lambda: local_session(symbol, (domestic_minutes, backup_minutes), now))
    local = local.copy()
    if quotes and (midnight != today or today + 570 * 60 not in local or len(local) < 2):
        try:
            quote = cached(("etf-local-quote", symbol), 20, lambda: local_quote(symbol, quotes, now))
        except DATA_ERRORS:
            quote = {}
        observed = quote.get("observed")
        if observed is not None and observed // 86400 * 86400 == today:
            if midnight != today:
                midnight, local, source = today, {}, None
            if today + 570 * 60 not in local and valid(quote.get("open")):
                local[today + 570 * 60] = quote["open"]
            if observed > today + 570 * 60 and valid(quote.get("price")):
                local.setdefault(observed, quote["price"])
            sources = dict.fromkeys(filter(None, (source, quote.get("source"))))
            source = " / ".join(sources) or None
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
        midnight = today
    start = midnight + 570 * 60
    result["start"] = stamp(start)
    finish = min(int(now + BJ) // 60 * 60, midnight + 900 * 60)

    def load(ticker):
        if not ticker or finish <= start:
            return {}
        try:
            # Cache provider bars through the current completed minute, independently of fund.
            return cached(("etf-foreign", ticker, start), 20,
                          lambda: foreign_session(ticker, start, finish, yahoo))
        except DATA_ERRORS:
            return {}

    with ThreadPoolExecutor(max_workers=2) as pool:
        overseas, fx = pool.map(load, (ref[0] if ref else None, FX.get(currency)))
    series_by_row = (local, overseas, fx)
    candidates = [{t for t in series if t > start} if start in series else set()
                  for series in series_by_row]
    endpoint = max(set.union(*candidates),
                   key=lambda t: (sum(t in points for points in candidates), t), default=None)
    if endpoint is not None and sum(endpoint in points for points in candidates) > 1:
        result["end"] = stamp(endpoint)
    ratios = {}
    for row, series, points in zip(rows, series_by_row, candidates):
        if series:
            row["observedAt"] = stamp(max(series))
        row_endpoint = endpoint if endpoint in points else max(points, default=None)
        if row_endpoint is not None:
            ratio = series[row_endpoint] / series[start]
            if row_endpoint == endpoint:
                ratios[row["key"]] = ratio
            row["pct"] = (ratio - 1) * 100
            row["time"] = stamp(row_endpoint)
        elif not series:
            row["status"] = "暂无成交数据" if row["source"] or row["key"] == "etf" else "无映射数据源"
        elif start not in series:
            row["status"] = "缺少 09:30 基准"
        else:
            row["status"] = "缺少开盘后成交"
    if "benchmark" in ratios and "fx" in ratios:
        converted = ratios["benchmark"] * ratios["fx"]
        rows.append({"key": "converted", "name": "基准折算人民币", "pct": (converted - 1) * 100,
                     "time": result["end"]})
        if "etf" in ratios:
            rows.append({"key": "difference", "name": "ETF 相对基准偏离", "pct": (ratios["etf"] / converted - 1) * 100,
                         "time": result["end"]})
    return result
