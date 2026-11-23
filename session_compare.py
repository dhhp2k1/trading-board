"""用北京时间 09:30 起点和双方共有的已完成分钟比较，不向前填充停市价格。"""
import json
import math
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone


FUTURES = {"NQ": "NQ=F", "ES": "ES=F", "GC": "GC=F", "CL": "CL=F"}
STOCKS = {"NVDA", "AAPL", "TSLA"}
BJ = 8 * 3600


def valid(value):
    return isinstance(value, (int, float)) and math.isfinite(value) and value > 0


def overnight(symbol, day_start):
    key = os.getenv("APCA_API_KEY_ID")
    secret = os.getenv("APCA_API_SECRET_KEY")
    if not key or not secret:
        raise ValueError("个股夜盘需要 Alpaca BOATS 行情权限，可切换纳指期货")
    def iso(t):
        return datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    start = day_start + 570 * 60 - BJ
    end = min(time.time(), start + 330 * 60)
    if end <= start:
        return []
    def fetch(until):
        params = urllib.parse.urlencode(dict(timeframe="1Min", start=iso(start), end=iso(until), feed="boats", limit=1000))
        req = urllib.request.Request(f"https://data.alpaca.markets/v2/stocks/{symbol}/bars?{params}",
                                     headers={"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret})
        with urllib.request.urlopen(req, timeout=6) as resp:
            return json.load(resp).get("bars") or []

    try:
        bars = fetch(end)
    except urllib.error.HTTPError as exc:
        delayed_end = time.time() - 16 * 60
        if exc.code != 403 or delayed_end >= end:
            raise
        bars = fetch(delayed_end) if delayed_end > start else []
    return [(int(datetime.fromisoformat(b["t"].replace("Z", "+00:00")).timestamp()), b["o"], b["c"]) for b in bars]


def compare(symbol, ref, cached, domestic_minutes, yahoo):
    if not re.fullmatch(r"(sh|sz|bj)\d{6}", symbol) or ref not in FUTURES.keys() | STOCKS:
        raise ValueError("标的或海外参考不支持")
    local = cached(("session-cn", symbol), 20, lambda: domestic_minutes(symbol, "min"))["bars"]
    if not local:
        return {"message": "暂无境内分时"}
    now = time.time()
    midnight = int(local[-1]["time"] // 86400 * 86400)
    day = time.strftime("%Y%m%d", time.gmtime(midnight))
    start = midnight + 570 * 60
    stamp = lambda t: time.strftime("%H:%M", time.gmtime(t))
    cn = {x["time"]: x["value"] for x in local if valid(x.get("value")) and
          x["time"] <= now + BJ and (start <= x["time"] <= start + 120*60 or
          midnight + 780*60 <= x["time"] <= midnight + 900*60)}
    result = {"day": day, "source": "Yahoo Finance · 期货" if ref in FUTURES else "Alpaca · BOATS 夜盘",
              "points": [], "cnLast": stamp(max(cn)) if cn else None}
    if start not in cn:
        return dict(result, message="缺少境内 09:30 基准")
    def load():
        if ref in STOCKS:
            return overnight(ref, midnight)
        r = yahoo(FUTURES[ref], "5d", "1m", True)
        q = r["indicators"]["quote"][0]
        return list(zip(r["timestamp"], q["open"], q["close"]))
    try:
        bars = cached(("session-bars", ref, day), 25, load)
    except ValueError as exc:
        return dict(result, message=str(exc))
    except (OSError, KeyError, TypeError, IndexError):
        return dict(result, message="海外分钟行情暂不可用，请核对行情权限或稍后刷新")
    base = None
    closes = {}
    for ts, opened, close in bars:
        if not ts or ts % 60 or ts + 60 > now:
            continue
        t = ts + BJ
        if t == start and valid(opened):
            base = opened
        if start <= t < midnight + 900*60 and valid(close):
            closes[t + 60] = close
    result["refLast"] = stamp(max(closes)) if closes else None
    if not base:
        return dict(result, message="缺少该交易日海外 09:30 分钟开盘价")
    points = [[stamp(start), 0, 0]]
    for t in sorted(cn.keys() & closes.keys()):
        points.append([stamp(t), (cn[t] / cn[start] - 1)*100, (closes[t] / base - 1)*100])
    if len(points) < 2:
        return dict(result, message="等待双方共同完成的分钟")
    return dict(result, points=points, basePrice=cn[start])
