"""投资日历：能影响市场的重要事件（只用 Python 标准库、免费数据源）。

server.py 把 /api/calendar 交给 handle(qs)。参数：
  /api/calendar                    从昨天起 15 天
  /api/calendar?from=2026-11-10&days=21   指定起始日（北京时间）和天数（最多 45）
  /api/calendar?force=1            忽略缓存重新抓取

返回 {"events": [...], "sources": {名称: {ok, n, err}}, "ts": 秒}
event: {id, ts(秒，全天事件为 null), date("YYYY-MM-DD"，全天事件用), allDay, region(CN/US/EU/JP/GB/HK/...),
        type(data 数据 / cb 央行 / event 事件 / earn 财报 / holiday 休市 / expiry 交割), imp(1 一般 / 2 关注 / 3 重要),
        title, prev, fcst, actual, unit, src, sym(财报对应的看板代码，可点开图表)}

来源（每个独立容错，挂一个不影响其他）：
  金十日历   cdn-rili.jin10.com 每日 economics/event JSON（中文，自带 1~5 星重要度）—— 首选
  ForexFactory  nfs.faireconomy.media 本周/下周 JSON（英文，High/Medium/Low）—— 金十拿不到时兜底
  纳斯达克   api.nasdaq.com 财报日历，只留大市值公司
  内置       美联储/欧央行/日本央行议息日、各交易所休市、LPR、期权/期货交割日（按规则推算）
"""
import datetime as dt
import json
import re
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
_POOL = ThreadPoolExecutor(max_workers=8, thread_name_prefix="ecocal")
_cache = {}
_lock = threading.Lock()
BJ = dt.timezone(dt.timedelta(hours=8))
UTC = dt.timezone.utc


def _get(url, timeout=8, headers=None):
    h = {"User-Agent": UA, "Accept": "application/json, text/plain, */*", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"}
    h.update(headers or {})
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def _cached(key, ttl, fn, force=False):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
    if hit and not force and now - hit[0] < ttl:
        return hit[1]
    try:
        val = fn()
    except Exception:
        if hit and now - hit[0] < 6 * 3600:  # 失败时先用旧数据
            return hit[1]
        raise
    with _lock:
        _cache[key] = (now, val)
    return val


# ---------------- 时区（不依赖 tzdata，Windows 上的 Python 往往没有） ----------------
def _nth_weekday(y, m, wd, n):
    """某月第 n 个星期 wd（0=周一）；n=-1 表示最后一个。"""
    if n > 0:
        d = dt.date(y, m, 1)
        d += dt.timedelta(days=(wd - d.weekday()) % 7)
        return d + dt.timedelta(weeks=n - 1)
    nxt = dt.date(y + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)
    return nxt - dt.timedelta(days=(nxt.weekday() - wd) % 7)


def _us_offset(d):  # 美东：3 月第二个周日 ~ 11 月第一个周日为夏令时
    return -4 if _nth_weekday(d.year, 3, 6, 2) <= d < _nth_weekday(d.year, 11, 6, 1) else -5


def _eu_offset(d):  # 欧洲中部：3 月最后一个周日 ~ 10 月最后一个周日为夏令时
    return 2 if _nth_weekday(d.year, 3, 6, -1) <= d < _nth_weekday(d.year, 10, 6, -1) else 1


def _ts(d, hh, mm, offset_h):
    return int(dt.datetime(d.year, d.month, d.day, hh, mm, tzinfo=dt.timezone(dt.timedelta(hours=offset_h))).timestamp())


def _et(d, hh, mm):
    return _ts(d, hh, mm, _us_offset(d))


def _parse_time(s):
    """金十等返回的时间字符串 → 秒。无时区信息的按北京时间。"""
    if s is None or s == "":
        return None
    if isinstance(s, (int, float)):
        return int(s / 1000 if s > 1e11 else s)
    s = str(s).strip()
    if re.fullmatch(r"\d{10,13}", s):
        v = int(s)
        return v // 1000 if v > 1e11 else v
    s = s.replace("Z", "+00:00").replace("/", "-")
    s = re.sub(r"\.\d+(?=[+-]\d\d:?\d\d$|$)", "", s)
    try:
        t = dt.datetime.fromisoformat(s.replace(" ", "T"))
    except ValueError:
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=BJ)
    return int(t.timestamp())


# ---------------- 地区 / 标题 ----------------
REGION_CN = {
    "中国": "CN", "中国大陆": "CN", "美国": "US", "欧元区": "EU", "欧盟": "EU", "德国": "EU", "法国": "EU",
    "意大利": "EU", "西班牙": "EU", "日本": "JP", "英国": "GB", "中国香港": "HK", "香港": "HK", "澳大利亚": "AU",
    "澳洲": "AU", "加拿大": "CA", "瑞士": "CH", "新西兰": "NZ", "韩国": "KR", "印度": "IN", "全球": "GL",
}
REGION_FF = {"CNY": "CN", "USD": "US", "EUR": "EU", "JPY": "JP", "GBP": "GB", "AUD": "AU", "CAD": "CA",
             "CHF": "CH", "NZD": "NZ", "All": "GL"}
# 金十里这些国家的数据对 A 股 / 港股 / 美股影响有限，最高只给"关注"
MINOR_REGIONS = {"AU", "CA", "CH", "NZ", "KR", "IN", "XX"}

# 命中即视为顶级事件（无论来源给几星）
TOP_RE = re.compile(
    r"利率决议|议息|联邦基金|FOMC|非农|失业率|CPI|PCE|GDP|零售销售|LPR|贷款市场报价利率|降准|政治局|中央经济工作会议|"
    r"国务院常务|两会|全国人大|鲍威尔.*(讲话|发表|新闻发布)|杰克逊霍尔|"
    r"Non-Farm|Unemployment Rate|CPI|Core PCE|GDP|Federal Funds|Rate Statement|Policy Rate|Main Refinancing|"
    r"Monetary Policy Statement|Retail Sales m/m|Fed Chair", re.I)
TOP_REGIONS = {"CN", "US"}
# 对 A 股特别重要的国内数据
CN_TOP_RE = re.compile(r"PMI|社会融资|社融|新增人民币贷款|M2|社会消费品零售|工业增加值|固定资产投资|进出口|贸易帐|"
                       r"Caixin|Industrial Production|New Loans|M2 Money", re.I)
CB_RE = re.compile(r"利率决议|议息|联邦基金|FOMC|央行|LPR|降准|Rate Statement|Policy Rate|Federal Funds|Main Refinancing|"
                   r"Monetary Policy|Cash Rate|Official Bank Rate|BOJ|ECB|Fed ", re.I)

FF_ZH = [  # ForexFactory 英文标题 → 中文（按顺序匹配，覆盖常见的重要数据）
    (r"^Non-Farm Employment Change", "非农就业人数"), (r"^Unemployment Rate", "失业率"),
    (r"^Core CPI m/m", "核心CPI月率"), (r"^Core CPI y/y", "核心CPI年率"), (r"^CPI m/m", "CPI月率"), (r"^CPI y/y", "CPI年率"),
    (r"^Core PPI m/m", "核心PPI月率"), (r"^PPI m/m", "PPI月率"), (r"^PPI y/y", "PPI年率"),
    (r"^Core PCE Price Index m/m", "核心PCE物价指数月率"), (r"^Advance GDP q/q", "GDP季率初值"),
    (r"^Prelim GDP q/q", "GDP季率修正值"), (r"^Final GDP q/q", "GDP季率终值"), (r"^GDP q/q", "GDP季率"), (r"^GDP y/y", "GDP年率"),
    (r"^Federal Funds Rate", "美联储利率决议"), (r"^FOMC Statement", "FOMC声明"), (r"^FOMC Press Conference", "美联储主席新闻发布会"),
    (r"^FOMC Meeting Minutes", "FOMC会议纪要"), (r"^Fed Chair (\w+) Speaks", r"美联储主席\1讲话"),
    (r"^Main Refinancing Rate", "欧洲央行利率决议"), (r"^ECB Press Conference", "欧洲央行新闻发布会"),
    (r"^BOJ Policy Rate", "日本央行利率决议"), (r"^BOJ Press Conference", "日本央行新闻发布会"),
    (r"^Official Bank Rate", "英国央行利率决议"), (r"^Cash Rate", "澳洲联储利率决议"), (r"^Overnight Rate", "加拿大央行利率决议"),
    (r"^Retail Sales m/m", "零售销售月率"), (r"^Core Retail Sales m/m", "核心零售销售月率"), (r"^Retail Sales y/y", "社会消费品零售总额年率"),
    (r"^Industrial Production y/y", "规模以上工业增加值年率"), (r"^Fixed Asset Investment ytd/y", "城镇固定资产投资年率"),
    (r"^Manufacturing PMI", "制造业PMI"), (r"^Non-Manufacturing PMI", "非制造业PMI"), (r"^Caixin Manufacturing PMI", "财新制造业PMI"),
    (r"^Caixin Services PMI", "财新服务业PMI"), (r"^ISM Manufacturing PMI", "ISM制造业PMI"), (r"^ISM Services PMI", "ISM非制造业PMI"),
    (r"^Flash Manufacturing PMI", "制造业PMI初值"), (r"^Flash Services PMI", "服务业PMI初值"),
    (r"^Trade Balance", "贸易帐"), (r"^New Loans", "新增人民币贷款"), (r"^M2 Money Supply y/y", "M2货币供应年率"),
    (r"^Unemployment Claims", "初请失业金人数"), (r"^JOLTS Job Openings", "JOLTS职位空缺"), (r"^ADP Non-Farm Employment Change", "ADP就业人数"),
    (r"^Average Hourly Earnings m/m", "平均时薪月率"), (r"^Prelim UoM Consumer Sentiment", "密歇根消费者信心指数初值"),
    (r"^CB Consumer Confidence", "谘商会消费者信心指数"), (r"^Durable Goods Orders m/m", "耐用品订单月率"),
    (r"^Bank Holiday", "银行假日"), (r"^(\w+) Speaks", r"\1讲话"),
]
FF_ZH = [(re.compile(p, re.I), z) for p, z in FF_ZH]
REGION_NAME = {"CN": "中国", "US": "美国", "EU": "欧元区", "JP": "日本", "GB": "英国", "HK": "香港", "AU": "澳洲",
               "CA": "加拿大", "CH": "瑞士", "NZ": "新西兰", "GL": "全球"}


def _imp(region, title, star3):
    """3 档：3 重要 / 2 关注 / 1 一般。star3 为来源自带重要度换算后的档位。"""
    imp = star3
    if TOP_RE.search(title or "") and region in TOP_REGIONS | {"EU", "JP"}:
        imp = 3 if region in TOP_REGIONS or CB_RE.search(title) else max(imp, 2)
    if region == "CN" and CN_TOP_RE.search(title or ""):
        imp = 3
    if region in MINOR_REGIONS:
        imp = min(imp, 2)
    return imp


def _num(v):
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s in ("None", "null", "--", "-") else s


# ---------------- 金十日历 ----------------
JIN10_HEADERS = {"Referer": "https://rili.jin10.com/", "Origin": "https://rili.jin10.com",
                 "x-app-id": "bVBF4FyRTn5NJF5n", "x-version": "1.0.0"}


def _jin10_file(d, kind):
    url = f"https://cdn-rili.jin10.com/web_data/{d.year}/daily/{d:%m}/{d:%d}/{kind}.json"
    data = json.loads(_get(url, headers=JIN10_HEADERS))
    if isinstance(data, dict):
        data = data.get("data") or data.get("list") or []
    return data if isinstance(data, list) else []


def _pick(o, *keys):
    for k in keys:
        v = o.get(k)
        if v not in (None, ""):
            return v
    return None


def jin10_day(d):
    out = []
    for kind in ("economics", "event"):
        try:
            rows = _jin10_file(d, kind)
        except Exception:  # 某天的 event 文件可能不存在
            if kind == "economics":
                raise
            continue
        for o in rows:
            if not isinstance(o, dict):
                continue
            country = str(_pick(o, "country", "region") or "")
            region = REGION_CN.get(country, "XX")
            star = int(float(_pick(o, "star", "importance") or 1))
            if kind == "economics":
                name = str(_pick(o, "name", "title") or "")
                period = str(o.get("time_period") or "")
                title = (period + name) if period and period not in name else name
                ts = _parse_time(_pick(o, "pub_time", "public_date", "time", "date"))
                typ = "cb" if CB_RE.search(title) else "data"
                ev = {"prev": _num(_pick(o, "revised", "previous")), "fcst": _num(o.get("consensus")),
                      "actual": _num(o.get("actual")), "unit": _num(o.get("unit"))}
            else:
                title = str(_pick(o, "event_content", "content", "title", "name") or "")
                people = o.get("people")
                if people and str(people) not in title:
                    title = f"{people}：{title}" if len(str(people)) < 12 else title
                ts = _parse_time(_pick(o, "event_time", "pub_time", "time", "date"))
                typ = "cb" if CB_RE.search(title) else "event"
                ev = {"prev": "", "fcst": "", "actual": "", "unit": ""}
                if region == "XX" and o.get("region"):
                    region = REGION_CN.get(str(o.get("region")), "XX")
            if not title or not ts:
                continue
            star3 = 3 if star >= 5 or (star == 4 and region in TOP_REGIONS) else 2 if star >= 3 else 1
            if region == "XX":
                title = f"{country}{title}" if country and not title.startswith(country) else title
            out.append({"ts": ts, "region": region, "type": typ, "imp": _imp(region, title, star3), "title": title,
                        "src": "金十", "stars": star, **ev})
    return out


def fetch_jin10(start, days, force):
    jobs = []
    today = dt.datetime.now(BJ).date()
    for i in range(days):
        d = start + dt.timedelta(days=i)
        ttl = 120 if abs((d - today).days) <= 1 else (6 * 3600 if d < today else 1800)
        jobs.append(_POOL.submit(_cached, ("jin10", d.isoformat()), ttl, lambda d=d: jin10_day(d), force))
    out, errs = [], 0
    for j in jobs:
        try:
            out += j.result(timeout=20)
        except Exception:
            errs += 1
    if errs == len(jobs):
        raise RuntimeError("金十日历全部请求失败")
    return out


# ---------------- ForexFactory（兜底） ----------------
def _ff_title(t):
    for rx, zh in FF_ZH:
        if rx.search(t):
            return rx.sub(zh, t, count=1)
    return t


def ff_week(which):
    data = json.loads(_get(f"https://nfs.faireconomy.media/ff_calendar_{which}.json", timeout=10))
    out = []
    for o in data:
        region = REGION_FF.get(o.get("country"), "XX")
        impact = o.get("impact")
        ts = _parse_time(o.get("date"))
        if not ts:
            continue
        raw = o.get("title") or ""
        title = _ff_title(raw)
        if region == "XX":
            title = f"{o.get('country')} {title}"
        if impact == "Holiday":
            out.append({"ts": None, "date": dt.datetime.fromtimestamp(ts, BJ).date().isoformat(), "allDay": True,
                        "region": region, "type": "holiday", "imp": 1,
                        "title": f"{REGION_NAME.get(region, '')}{title}", "src": "FF"})
            continue
        star3 = {"High": 3, "Medium": 2}.get(impact, 1)
        imp = _imp(region, raw, star3)
        out.append({"ts": ts, "region": region, "type": "cb" if CB_RE.search(raw) else "data", "imp": imp,
                    "title": title, "titleEn": raw if title != raw else "", "prev": _num(o.get("previous")),
                    "fcst": _num(o.get("forecast")), "actual": _num(o.get("actual")), "unit": "", "src": "FF"})
    return out


def fetch_ff(force):
    out = []
    for which in ("thisweek", "nextweek"):
        try:  # 官方要求别频繁请求：缓存 1 小时
            out += _cached(("ff", which), 3600, lambda w=which: ff_week(w), force)
        except Exception:
            if which == "thisweek":
                raise
    return out


# ---------------- 纳斯达克财报日历（只留大公司） ----------------
ZH_NAMES = {
    "AAPL": "苹果", "MSFT": "微软", "NVDA": "英伟达", "GOOGL": "谷歌", "GOOG": "谷歌", "AMZN": "亚马逊", "META": "Meta",
    "TSLA": "特斯拉", "AVGO": "博通", "BRK.B": "伯克希尔", "TSM": "台积电", "LLY": "礼来", "JPM": "摩根大通", "V": "Visa",
    "WMT": "沃尔玛", "MA": "万事达", "ORCL": "甲骨文", "NFLX": "奈飞", "COST": "好市多", "XOM": "埃克森美孚", "HD": "家得宝",
    "PG": "宝洁", "JNJ": "强生", "BAC": "美国银行", "ABBV": "艾伯维", "KO": "可口可乐", "AMD": "AMD", "CRM": "Salesforce",
    "ASML": "阿斯麦", "BABA": "阿里巴巴", "PDD": "拼多多", "JD": "京东", "BIDU": "百度", "NTES": "网易", "TCEHY": "腾讯",
    "CSCO": "思科", "ADBE": "Adobe", "QCOM": "高通", "INTC": "英特尔", "MU": "美光", "DIS": "迪士尼", "NKE": "耐克",
    "PLTR": "Palantir", "SNOW": "Snowflake", "TGT": "塔吉特", "LOW": "劳氏", "MRVL": "迈威尔", "DELL": "戴尔", "PANW": "Palo Alto",
    "ARM": "Arm", "SMCI": "超微电脑", "UNH": "联合健康", "GS": "高盛", "MS": "摩根士丹利", "TME": "腾讯音乐", "LI": "理想汽车",
    "NIO": "蔚来", "XPEV": "小鹏汽车", "BILI": "哔哩哔哩", "YUMC": "百胜中国", "BEKE": "贝壳", "TCOM": "携程",
}
EARN_MIN_CAP = 100e9      # 1000 亿美元以上才收录
EARN_TOP_CAP = 500e9      # 5000 亿美元以上标为重要
CN_ADR = {"BABA", "PDD", "JD", "BIDU", "NTES", "TME", "LI", "NIO", "XPEV", "BILI", "YUMC", "BEKE", "TCOM"}


def _cap(s):
    try:
        return float(re.sub(r"[^\d.]", "", str(s)) or 0)
    except ValueError:
        return 0


def nasdaq_day(d):
    data = json.loads(_get(f"https://api.nasdaq.com/api/calendar/earnings?date={d.isoformat()}", timeout=10,
                           headers={"Origin": "https://www.nasdaq.com", "Referer": "https://www.nasdaq.com/"}))
    rows = ((data or {}).get("data") or {}).get("rows") or []
    out = []
    for r in rows:
        sym = (r.get("symbol") or "").upper()
        cap = _cap(r.get("marketCap"))
        if cap < EARN_MIN_CAP and not (sym in CN_ADR and cap > 5e9):
            continue
        when = r.get("time") or ""
        if "pre" in when:
            ts, tag = _et(d, 7, 30), "盘前"
        elif "after" in when:
            ts, tag = _et(d, 16, 5), "盘后"
        else:
            ts, tag = None, ""
        zh = ZH_NAMES.get(sym, "")
        name = zh or re.sub(r",? (Inc|Corp|Corporation|Ltd|Limited|Holdings?|PLC|N\.V\.|Co)\.?$", "", r.get("name") or sym)
        ev = {"region": "US", "type": "earn", "imp": 3 if cap >= EARN_TOP_CAP else 2,
              "title": f"{name}（{sym}）财报" + (f"·{tag}" if tag else ""), "src": "纳斯达克",
              "fcst": _num(r.get("epsForecast")), "prev": _num(r.get("lastYearEPS")), "actual": "", "unit": "EPS",
              "sym": "yf:" + sym.replace(".", "-"), "cap": cap}
        if ts:
            ev["ts"] = ts
        else:
            ev.update({"ts": None, "date": d.isoformat(), "allDay": True})
        out.append(ev)
    return out


def fetch_earnings(start, days, force):
    jobs = []
    for i in range(days):
        d = start + dt.timedelta(days=i)
        if d.weekday() < 5:
            jobs.append(_POOL.submit(_cached, ("nasdaq", d.isoformat()), 6 * 3600, lambda d=d: nasdaq_day(d), force))
    out, errs = [], 0
    for j in jobs:
        try:
            out += j.result(timeout=25)
        except Exception:
            errs += 1
    if jobs and errs == len(jobs):
        raise RuntimeError("纳斯达克财报日历请求失败")
    return out


# ---------------- 内置：议息日 / 休市 / 交割日 ----------------
# 官方已公布的日程（来自美联储 / 欧洲央行 / 日本央行官网）。日期为会议最后一天（公布决议当天，当地日期）。
FOMC = ["2026-12-09", "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28", "2027-09-22",
        "2027-10-27", "2027-12-08"]
FOMC_SEP = {"2026-12-09", "2027-03-17", "2027-06-09", "2027-09-22", "2027-12-08"}  # 带点阵图/经济预测
ECB = ["2026-12-17"]
BOJ = ["2026-12-18"]
# 休市（交易所官网）。A 股 2027 年节假日安排以国务院 / 交易所公告为准，公布后在这里补充。
HOLIDAYS = {
    "CN": {"2027-01-01": "元旦"},
    "HK": {"2026-12-25": "圣诞节", "2027-01-01": "元旦"},
    "US": {"2026-11-26": "感恩节", "2026-12-25": "圣诞节", "2027-01-01": "元旦", "2027-01-18": "马丁·路德·金纪念日",
           "2027-02-15": "总统日", "2027-03-26": "耶稣受难日", "2027-05-31": "阵亡将士纪念日", "2027-06-18": "六月节（补休）",
           "2027-07-05": "独立日（补休）", "2027-09-06": "劳动节", "2027-11-25": "感恩节", "2027-12-24": "圣诞节（补休）"},
}
HALF_DAYS = {
    "US": {"2026-11-27": "感恩节次日 13:00 提前收盘", "2026-12-24": "平安夜 13:00 提前收盘", "2027-11-26": "感恩节次日 13:00 提前收盘"},
    "HK": {"2026-12-24": "平安夜 半日市", "2026-12-31": "除夕 半日市"},
}
MKT_NAME = {"CN": "A股", "HK": "港股", "US": "美股"}


def _is_open(region, d):
    return d.weekday() < 5 and d.isoformat() not in HOLIDAYS.get(region, {})


def _shift_open(region, d, step):
    while not _is_open(region, d):
        d += dt.timedelta(days=step)
    return d


def builtin(start, days):
    end = start + dt.timedelta(days=days)
    out = []

    def add(ev):
        out.append({"src": "内置", "prev": "", "fcst": "", "actual": "", "unit": "", **ev})

    for s in FOMC:
        d = dt.date.fromisoformat(s)
        if start <= d < end:
            add({"ts": _et(d, 14, 0), "region": "US", "type": "cb", "imp": 3, "key": "rate",
                 "title": "美联储利率决议" + ("（含经济预测/点阵图）" if s in FOMC_SEP else "")})
            add({"ts": _et(d, 14, 30), "region": "US", "type": "cb", "imp": 3, "key": "presser",
                 "title": "美联储主席新闻发布会"})
    for s in ECB:
        d = dt.date.fromisoformat(s)
        if start <= d < end:
            add({"ts": _ts(d, 14, 15, _eu_offset(d)), "region": "EU", "type": "cb", "imp": 3, "key": "rate", "title": "欧洲央行利率决议"})
    for s in BOJ:
        d = dt.date.fromisoformat(s)
        if start <= d < end:
            add({"ts": None, "date": s, "allDay": True, "region": "JP", "type": "cb", "imp": 3, "key": "rate",
                 "title": "日本央行利率决议（午间公布，时间不固定）"})
    for region, days_ in HOLIDAYS.items():
        for s, name in days_.items():
            d = dt.date.fromisoformat(s)
            if start <= d < end and d.weekday() < 5:
                add({"ts": None, "date": s, "allDay": True, "region": region, "type": "holiday", "imp": 2,
                     "title": f"{MKT_NAME[region]}休市·{name}"})
    for region, days_ in HALF_DAYS.items():
        for s, name in days_.items():
            d = dt.date.fromisoformat(s)
            if start <= d < end:
                add({"ts": None, "date": s, "allDay": True, "region": region, "type": "holiday", "imp": 1,
                     "title": f"{MKT_NAME[region]}{name}"})

    months = sorted({(d.year, d.month) for d in (start + dt.timedelta(days=i) for i in range(days))})
    for y, m in months:
        # LPR：每月 20 日 9:00，遇节假日顺延
        d = _shift_open("CN", dt.date(y, m, 20), 1)
        if start <= d < end:
            add({"ts": _ts(d, 9, 0, 8), "region": "CN", "type": "cb", "imp": 3, "key": "lpr",
                 "title": "中国 LPR 报价（1年/5年期贷款市场报价利率）"})
        # 美股月度期权到期：第三个周五（遇假日提前），3/6/9/12 月为"四巫日"
        d = _shift_open("US", _nth_weekday(y, m, 4, 3), -1)
        if start <= d < end:
            quad = m in (3, 6, 9, 12)
            add({"ts": None, "date": d.isoformat(), "allDay": True, "region": "US", "type": "expiry", "imp": 3 if quad else 2,
                 "title": "美股四巫日（股指期货/期权集中到期）" if quad else "美股月度期权到期日"})
        # A 股：中金所股指期货/期权第三个周五交割；上交所/深交所 ETF 期权第四个周三到期（遇假日顺延）
        d = _shift_open("CN", _nth_weekday(y, m, 4, 3), 1)
        if start <= d < end:
            add({"ts": None, "date": d.isoformat(), "allDay": True, "region": "CN", "type": "expiry", "imp": 2,
                 "title": "A股 股指期货/股指期权交割日（IF/IH/IC/IM）"})
        d = _shift_open("CN", _nth_weekday(y, m, 2, 4), 1)
        if start <= d < end:
            add({"ts": None, "date": d.isoformat(), "allDay": True, "region": "CN", "type": "expiry", "imp": 2,
                 "title": "A股 ETF期权到期日（50ETF/300ETF 等）"})
        # 港股：恒指期货/期权月结算日 = 该月倒数第二个交易日
        d = dt.date(y + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)
        d = _shift_open("HK", d, -1)
        d = _shift_open("HK", d - dt.timedelta(days=1), -1)
        if start <= d < end:
            add({"ts": None, "date": d.isoformat(), "allDay": True, "region": "HK", "type": "expiry", "imp": 1,
                 "title": "港股 恒指期货/期权结算日"})
    return out


# ---------------- 合并 ----------------
def _local_date(ev):
    if ev.get("ts"):
        return dt.datetime.fromtimestamp(ev["ts"], BJ).date().isoformat()
    return ev.get("date")


def _dedupe(live, inner):
    """内置事件若与实时来源同一天同地区重复，就用实时来源的（时间更准，带前值/预期）。"""
    seen = {}
    for e in live:
        seen.setdefault((_local_date(e), e["region"]), []).append(e["title"] + " " + e.get("titleEn", ""))
    keep = []
    pat = {"rate": re.compile(r"利率决议|Federal Funds|Main Refinancing|Policy Rate", re.I),
           "presser": re.compile(r"新闻发布会|记者会|Press Conference", re.I), "lpr": re.compile(r"LPR|贷款市场报价")}
    for e in inner:
        k = e.get("key")
        if k and e.get("ts"):
            # 议息日横跨北京时间两天：前后一天都查
            d = dt.date.fromisoformat(_local_date(e))
            near = [x for dd in (d - dt.timedelta(days=1), d, d + dt.timedelta(days=1))
                    for x in seen.get((dd.isoformat(), e["region"]), [])]
            if any(pat[k].search(t) for t in near):
                continue
        elif k == "rate":
            if any(pat[k].search(t) for t in seen.get((e["date"], e["region"]), [])):
                continue
        keep.append(e)
    return keep


def handle(qs):
    def q(k, d=""):
        return (qs.get(k) or [d])[0]

    force = q("force") == "1"
    today = dt.datetime.now(BJ).date()
    try:
        start = dt.date.fromisoformat(q("from")) if q("from") else today - dt.timedelta(days=1)
    except ValueError:
        start = today - dt.timedelta(days=1)
    try:
        days = max(1, min(45, int(q("days", "15"))))
    except ValueError:
        days = 15
    end = start + dt.timedelta(days=days)

    sources, events = {}, []
    jobs = {"金十": _POOL.submit(fetch_jin10, start, days, force),
            "纳斯达克": _POOL.submit(fetch_earnings, start, min(days, 21), force)}
    results = {}
    for name, j in jobs.items():
        try:
            results[name] = j.result(timeout=40)
            sources[name] = {"ok": True, "n": len(results[name])}
        except Exception as e:  # noqa: BLE001
            results[name] = []
            sources[name] = {"ok": False, "n": 0, "err": str(e)[:120]}
    live = results["金十"]
    if not live:  # 金十拿不到时用 ForexFactory 兜底（只有本周和下周）
        try:
            live = fetch_ff(force)
            sources["ForexFactory"] = {"ok": True, "n": len(live)}
        except Exception as e:  # noqa: BLE001
            sources["ForexFactory"] = {"ok": False, "n": 0, "err": str(e)[:120]}
    inner = builtin(start, days)
    events = live + results["纳斯达克"] + _dedupe(live, inner)
    sources["内置"] = {"ok": True, "n": len(inner)}

    lo, hi = start.isoformat(), end.isoformat()
    out = []
    for e in events:
        d = _local_date(e)
        if not d or not (lo <= d < hi):
            continue
        e.setdefault("allDay", False)
        e["date"] = d
        e.pop("key", None)
        e["id"] = f"{e['src']}|{d}|{e.get('ts') or ''}|{e['title']}"
        out.append(e)
    out.sort(key=lambda e: (e["date"], 0 if e["allDay"] else 1, e.get("ts") or 0, -e["imp"]))
    return {"events": out, "sources": sources, "from": lo, "days": days, "ts": int(time.time())}


if __name__ == "__main__":  # 命令行自测：python ecocal.py
    r = handle({})
    print(json.dumps(r["sources"], ensure_ascii=False))
    for e in r["events"]:
        if e["imp"] >= 2:
            t = dt.datetime.fromtimestamp(e["ts"], BJ).strftime("%m-%d %H:%M") if e.get("ts") else e["date"][5:] + " 全天"
            print(t, e["region"], "★" * e["imp"], e["title"], e.get("prev", ""), e.get("fcst", ""), e.get("actual", ""))
