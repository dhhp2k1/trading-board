"""沪深上市 ETF 按跟踪标的对照。目录在首次打开面板时加载。"""
import json
import math
from datetime import datetime
from functools import lru_cache
from pathlib import Path


IOPV_TTL = 30


@lru_cache(maxsize=1)
def catalog():
    with Path(__file__).with_name("etf-indexes.json").open(encoding="utf-8") as stream:
        data = json.load(stream)
    return {symbol: dict(group, key=key) for key, group in data["groups"].items()
            for symbol in group["funds"]}, data["asOf"]


def number(value):
    try:
        value = float(value)
    except (ValueError, TypeError):
        return None
    return value if math.isfinite(value) else None


def positive(value):
    value = number(value)
    return value if value and value > 0 else None


def official_iopvs(category, http_get):
    """只接受单列 IOPV 和其自己的完整时戳。估算值、昨净值及行情时戳不可代替。"""
    try:
        url = f"https://www.jisilu.cn/data/{category}/{category}_list/"
        data = json.loads(http_get(url, referer="https://www.jisilu.cn/", timeout=3))
        return {r["id"]: (r["cell"].get("iopv"), r["cell"].get("iopv_dt"))
                for r in data.get("rows", []) if r.get("id") and isinstance(r.get("cell"), dict)}
    except (OSError, ValueError, TypeError, AttributeError):
        return {}


def matched_value(price, quote_time, estimate):
    if not price or not estimate or not positive(estimate[0]):
        return None, None
    try:
        observed = datetime.strptime(quote_time, "%Y-%m-%d %H:%M:%S")
        valued = datetime.strptime(estimate[1], "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        return None, None
    if valued.date() != observed.date() or abs((observed - valued).total_seconds()) > 60:
        return None, None
    return (price / positive(estimate[0]) - 1) * 100, estimate[1]


def estimates_for(category, cached, http_get):
    return cached(("etf-iopv", category), IOPV_TTL, lambda: official_iopvs(category, http_get))


def compare(symbol, fetch_quotes, cached, http_get):
    groups, as_of = catalog()
    group = groups.get(symbol)
    if not group:
        return {"index": None, "rows": []}
    funds = group["funds"]
    try:
        quotes = cached(("etf-peers", tuple(funds)), 5, lambda: fetch_quotes(list(funds)))
    except (OSError, ValueError, KeyError, TypeError):
        quotes = {}
    category = "qdii" if "跨境" in group["market"] else "etf"
    estimates = estimates_for(category, cached, http_get)
    rows = []
    for code, fallback_name in funds.items():
        quote = quotes.get(code, {})
        price = positive(quote.get("price"))
        bid, ask = positive(quote.get("bid")), positive(quote.get("ask"))
        stamp = quote.get("time") if quote.get("timestamp") else None
        amount = number(quote.get("amount"))
        spread = 20000 * (ask - bid) / (bid + ask) if bid and ask and ask >= bid else None
        premium, valued = matched_value(price, stamp, estimates.get(code[2:]))
        rows.append({"symbol": code, "name": quote.get("name") or fallback_name,
                     "price": price, "pct": number(quote.get("pct")) if price else None,
                     "bid": bid, "ask": ask, "spreadBps": spread,
                     "amount": amount if amount is not None and amount >= 0 else None,
                     "time": stamp, "premium": premium, "valuationTime": valued})
    return {"index": group["index"], "market": group["market"], "rows": rows,
            "source": f"腾讯报价 · 基金目录 {as_of} · IOPV 有独立时点时取自集思录"}
