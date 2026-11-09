"""资讯模块：免费、无需 key 的实时快讯流 + 个股新闻（只用 Python 标准库）。

server.py 把 /api/news 交给 handle(qs)。参数：
  /api/news                      全部来源合并的快讯流（按时间倒序）
  /api/news?src=wscn,sina        只要某些来源
  /api/news?s=sh600519&n=贵州茅台  个股新闻（A 股/港股走东方财富搜索，美股/港股走雅虎 RSS）
  /api/news?limit=200            条数上限（默认 150）
  /api/news?tr=0                 不翻译英文标题（默认翻译，见"英文标题翻译"一节）
  /api/news?tr_text=<英文>        翻译一段正文，返回 {"zh": ...}

返回 {"items": [...], "sources": [...], "ts": 秒}
item: {id, src, srcName, time(秒), title, text, url, level(0 普通 / 1 关注 / 2 重要), tags, symbols,
       titleZh(英文标题的中文翻译，翻好后才有), also/alsoSrc(同一条被其他来源也发了)}

来源（均为公开网页自己在用的接口；财联社需签名、金十需请求头，规则照搬其网页，非官方，可能改版；每个来源独立容错，挂一个不影响其他）：
  cls   财联社电报         level A/B 为重要
  jin10 金十数据快讯       important=1 为重要（会员专享条目跳过）
  wscn  华尔街见闻 7x24     自带重要度 score(1/2/3)
  sina  新浪财经 7x24       自带"焦点"标签
  mw    MarketWatch RSS    英文头条 + 突发 bulletins
  wsj   WSJ RSS            市场 / 商业 / 国际
  个股  东方财富资讯搜索 / 雅虎财经个股 RSS
"""
import html
import json
import re
import threading
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from email.utils import parsedate_to_datetime

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TradingBoard/1.0"
_POOL = ThreadPoolExecutor(max_workers=8)
_cache = {}
_lock = threading.Lock()

# 命中即标为"重要"的关键词（中英文）。可按自己口味增删。
HOT_WORDS = [
    "突发", "快讯", "央行", "降息", "加息", "降准", "美联储", "鲍威尔", "非农", "CPI", "PPI", "GDP", "PMI",
    "国务院", "证监会", "关税", "制裁", "停牌", "涨停", "跌停", "熔断", "暴跌", "暴涨", "大跌", "大涨", "创新高",
    "战争", "袭击", "爆炸", "违约", "破产", "Fed", "FOMC", "rate cut", "rate hike", "breaking", "plunge",
    "soar", "tariff", "recession",
]
_HOT_RE = re.compile("|".join(re.escape(w) for w in HOT_WORDS), re.I)


def _get(url, timeout=8, referer=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    if referer:
        req.add_header("Referer", referer)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    return raw.decode("utf-8", errors="replace")


def _cached(key, ttl, fn):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    try:
        val = fn()
    except Exception:
        # 失败时若有旧数据就先用旧的（最多 10 分钟），避免面板一闪而空
        if hit and now - hit[0] < 600:
            return hit[1]
        raise
    with _lock:
        _cache[key] = (now, val)
    return val


def _strip(s):
    s = re.sub(r"<br\s*/?>|</p>", "\n", s or "", flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def _split_title(text):
    """快讯常见写法"【标题】正文"，拆出标题。"""
    m = re.match(r"^\s*【([^】]{2,80})】\s*(.*)$", text, re.S)
    if m:
        return m.group(1), m.group(2).strip()
    return "", text


def _level(base, title, text):
    """0 普通 / 1 关注（命中关键词或来源标为次重要）/ 2 重要（来源标为重要）"""
    if base < 1 and _HOT_RE.search(title + " " + text[:120]):
        return 1
    return base


# ---------------- 华尔街见闻 ----------------
def fetch_wscn(limit=60):
    d = json.loads(_get("https://api-one-wscn.awtmt.com/apiv1/content/lives"
                        f"?channel=global-channel&limit={limit}"))
    out = []
    for it in d["data"]["items"]:
        text = _strip(it.get("content_text") or it.get("content"))
        title = (it.get("title") or "").strip()
        if not title:
            title, text = _split_title(text)
        score = it.get("score") or 1
        base = 2 if score >= 3 else (1 if score == 2 else 0)
        syms = [s.get("symbol") or s.get("name") for s in (it.get("symbols") or []) if isinstance(s, dict)]
        chans = [c.replace("-channel", "") for c in it.get("channels") or []]
        out.append({
            "id": f"wscn:{it['id']}", "src": "wscn", "srcName": "华尔街见闻",
            "time": int(it.get("display_time") or 0), "title": title, "text": text,
            "url": it.get("uri") or "", "level": _level(base, title, text),
            "tags": [c for c in chans if c != "global"][:3], "symbols": [s for s in syms if s],
        })
    return out


# ---------------- 新浪 7x24 ----------------
def fetch_sina(limit=60):
    d = json.loads(_get("https://zhibo.sina.com.cn/api/zhibo/feed"
                        f"?zhibo_id=152&page=1&page_size={limit}"))
    out = []
    for it in d["result"]["data"]["feed"]["list"]:
        text = _strip(it.get("rich_text"))
        title, text = _split_title(text)
        tags = [t.get("name") for t in it.get("tag") or [] if t.get("name")]
        base = 2 if ("焦点" in tags or it.get("is_focus")) else 0
        syms = []
        try:
            ext = json.loads(it.get("ext") or "{}")
            syms = [s.get("key") or s.get("symbol") for s in ext.get("stocks") or []]
            url = ext.get("docurl") or ""
        except ValueError:
            url = ""
        try:
            ts = int(time.mktime(time.strptime(it["create_time"], "%Y-%m-%d %H:%M:%S")))
            ts -= _bj_offset_fix()
        except (KeyError, ValueError):
            ts = 0
        out.append({
            "id": f"sina:{it['id']}", "src": "sina", "srcName": "新浪财经",
            "time": ts, "title": title, "text": text, "url": url or it.get("docurl") or "",
            "level": _level(base, title, text), "tags": [t for t in tags if t != "其他"][:3],
            "symbols": [s for s in syms if s],
        })
    return out


def _bj_offset_fix():
    """新浪时间是北京时间字符串；按本机时区解析后再校正到真实 UTC 秒数。"""
    local_off = -time.altzone if time.localtime().tm_isdst > 0 else -time.timezone
    return 8 * 3600 - local_off


# ---------------- 财联社电报 ----------------
# 签名规则来自财联社网页自身的 JS：参数按字母排序 urlencode 后 sign = md5(sha1(qs))。
# sv（版本号）偶尔会变，失效时到 www.cls.cn 网页源码里找新的值改这里。
CLS_SV = "8.7.9"


def fetch_cls():
    import hashlib
    p = {"appName": "CailianpressWeb", "name": "telegraph", "os": "web", "sv": CLS_SV}
    qs = urllib.parse.urlencode(sorted(p.items()))
    sign = hashlib.md5(hashlib.sha1(qs.encode()).hexdigest().encode()).hexdigest()
    d = json.loads(_get(f"https://www.cls.cn/api/cache?{qs}&sign={sign}",
                        referer="https://www.cls.cn/telegraph"))
    out = []
    for it in (d.get("data") or {}).get("roll_data") or []:
        text = _strip(it.get("content"))
        if text.startswith("【盘中宝】") or (it.get("title") or "").startswith("【盘中宝】"):
            continue  # 付费栏目预告，正文看不到
        t2, body = _split_title(text)
        title = (it.get("title") or "").strip() or t2
        if title and t2 == title:
            text = body
        text = re.sub(r"^财联社\d+月\d+日电，", "", text)
        base = 2 if it.get("level") in ("A", "B") else 0
        out.append({
            "id": f"cls:{it['id']}", "src": "cls", "srcName": "财联社",
            "time": int(it.get("ctime") or 0), "title": title, "text": text,
            "url": f"https://www.cls.cn/detail/{it['id']}", "level": _level(base, title, text),
            "tags": [s.get("subject_name") for s in it.get("subjects") or [] if s.get("subject_name")][:3],
            "symbols": [s.get("name") for s in it.get("stock_list") or [] if s.get("name")],
        })
    return out


# ---------------- 金十数据 ----------------
# 请求头来自金十网页自身（公开前端写死的 app id）；失效时到 www.jin10.com 网页里找新的值。
JIN10_HEADERS = {"x-app-id": "bVBF4FyRTn5NJF5n", "x-version": "1.0.0"}


def fetch_jin10():
    req = urllib.request.Request("https://flash-api.jin10.com/get_flash_list?channel=-8200&vip=1",
                                 headers={"User-Agent": UA, "Referer": "https://www.jin10.com/",
                                          **JIN10_HEADERS})
    with urllib.request.urlopen(req, timeout=8) as r:
        d = json.loads(r.read().decode("utf-8", errors="replace"))
    out = []
    for it in d.get("data") or []:
        data = it.get("data") or {}
        if data.get("lock") or it.get("type") == 1:  # 会员专享 / 非快讯条目跳过
            continue
        text = _strip(data.get("content"))
        if not text or "点击了解" in text or "点击查看" in text:
            continue
        title, text = _split_title(text)
        title = (data.get("title") or "").strip() or title
        text = re.sub(r"^金十数据\d+月\d+日讯，", "", text)
        try:
            ts = int(time.mktime(time.strptime(it["time"], "%Y-%m-%d %H:%M:%S"))) - _bj_offset_fix()
        except (KeyError, ValueError):
            ts = 0
        out.append({
            "id": f"jin10:{it['id']}", "src": "jin10", "srcName": "金十数据", "time": ts,
            "title": title, "text": text, "url": data.get("link") or "https://www.jin10.com/",
            "level": _level(2 if it.get("important") else 0, title, text), "tags": [], "symbols": [],
        })
    return out


# ---------------- RSS（MarketWatch / 雅虎个股） ----------------
def _rss(url, src, src_name, base_level=0):
    root = ET.fromstring(_get(url).encode("utf-8"))
    out = []
    for item in root.iter("item"):
        title = _strip(item.findtext("title"))
        if not title:
            continue
        link = (item.findtext("link") or "").strip()
        desc = _strip(item.findtext("description"))
        ts = 0
        pd = item.findtext("pubDate")
        if pd:
            try:
                ts = int(parsedate_to_datetime(pd).timestamp())
            except (TypeError, ValueError):
                pass
        guid = (item.findtext("guid") or link or title).strip()
        out.append({
            "id": f"{src}:{guid}", "src": src, "srcName": src_name, "time": ts, "title": title,
            "text": desc if desc != title else "", "url": link,
            "level": _level(base_level, title, desc), "tags": [], "symbols": [],
        })
    return out


def _dowjones(feeds, src, name, hot_feed=None):
    items = []
    for feed in feeds:
        try:
            items += _rss(f"https://feeds.content.dowjones.io/public/rss/{feed}", src, name,
                          2 if feed == hot_feed else 0)
        except Exception:  # noqa: BLE001
            pass
    if not items:
        raise RuntimeError(f"{name} RSS 无数据")
    week_ago = time.time() - 7 * 86400  # 部分 feed 偶尔夹带旧稿，过滤掉
    return [i for i in items if i["time"] > week_ago]


def fetch_mw():  # mw_bulletins 是突发快讯，标为重要
    return _dowjones(("mw_topstories", "mw_bulletins"), "mw", "MarketWatch", hot_feed="mw_bulletins")


def fetch_wsj():
    return _dowjones(("RSSMarketsMain", "WSJcomUSBusiness", "RSSWorldNews"), "wsj", "WSJ")


SOURCES = {
    # id: (显示名, 抓取函数, 缓存秒数)
    "cls": ("财联社", fetch_cls, 10),
    "jin10": ("金十数据", fetch_jin10, 10),
    "wscn": ("华尔街见闻", fetch_wscn, 10),
    "sina": ("新浪财经", fetch_sina, 10),
    "mw": ("MarketWatch", fetch_mw, 120),
    "wsj": ("华尔街日报 WSJ", fetch_wsj, 180),
}


# ---------------- 个股新闻 ----------------
def _yahoo_symbol(code):
    if code.startswith("yf:"):
        return code[3:]
    if code.startswith("hk") and code[2:].isdigit():
        return f"{int(code[2:]):04d}.HK"
    if code[:2] in ("sh", "sz", "bj") and code[2:].isdigit():
        return code[2:] + {"sh": ".SS", "sz": ".SZ", "bj": ".BJ"}[code[:2]]
    return None


def fetch_eastmoney(keyword, size=30):
    param = {
        "uid": "", "keyword": keyword, "type": ["cmsArticleWebOld"], "client": "web",
        "clientType": "web", "clientVersion": "curr",
        "param": {"cmsArticleWebOld": {"searchScope": "default", "sort": "default", "pageIndex": 1,
                                       "pageSize": size, "preTag": "", "postTag": ""}},
    }
    url = ("https://search-api-web.eastmoney.com/search/jsonp?cb=cb&param="
           + urllib.parse.quote(json.dumps(param, ensure_ascii=False)))
    body = _get(url, referer="https://so.eastmoney.com/")
    body = body[body.index("(") + 1: body.rindex(")")]
    d = json.loads(body)
    out = []
    for it in (d.get("result") or {}).get("cmsArticleWebOld") or []:
        try:
            ts = int(time.mktime(time.strptime(it["date"], "%Y-%m-%d %H:%M:%S"))) - _bj_offset_fix()
        except (KeyError, ValueError):
            ts = 0
        title, text = _strip(it.get("title")), _strip(it.get("content"))
        out.append({
            "id": f"em:{it.get('code')}", "src": "em", "srcName": it.get("mediaName") or "东方财富",
            "time": ts, "title": title, "text": text[:300], "url": it.get("url") or "",
            "level": _level(0, title, text), "tags": [], "symbols": [],
        })
    return out


def stock_news(code, name):
    jobs = {}
    is_cn = code[:2] in ("sh", "sz", "bj", "hk")
    if is_cn and (name or code):
        kw = name or code[2:]
        jobs["东方财富"] = lambda: _cached(("em", kw), 120, lambda: fetch_eastmoney(kw))
    ys = _yahoo_symbol(code)
    if ys and code[:2] not in ("sh", "sz", "bj"):
        url = ("https://feeds.finance.yahoo.com/rss/2.0/headline?s="
               + urllib.parse.quote(ys) + "&region=US&lang=en-US")
        jobs["雅虎财经"] = lambda: _cached(("yrss", ys), 300, lambda: _rss(url, "yahoo", "Yahoo Finance"))
    return _run(jobs)


# ---------------- 英文标题翻译（免费、无需 key） ----------------
# 后台线程把英文标题批量翻成中文，结果存盘，每条只翻一次。接口返回时把已翻好的放进 titleZh，
# 还没翻好的下一次刷新（15 秒）就会带上。翻译服务依次尝试，某个失败就暂停它一会儿：
#   1. B站 Index-Translate 免费接口（index-translate.bilibili.com，OpenAI 兼容，无需 key，国内直连），
#      每次请求翻 4 条标题，6 个请求并发。
#   2. Google 翻译网页接口（translate.googleapis.com）逐条翻，需要能访问 Google。
import os  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(os.environ.get("APPDATA") or os.path.expanduser("~"), "TradingBoard")
INDEX_API = "https://index-translate.bilibili.com/v1/chat/completions"
INDEX_MODEL = "Index-Translate-35B-A3B"
BATCH = 4       # 每次请求翻几条标题（实测小批量+并发最快：4 条约 2 秒）
PARALLEL = 6    # 同时发几个请求
_CJK = re.compile(r"[\u4e00-\u9fff]")


class _BadResult(Exception):
    """服务正常但结果对不上：换个方式再试，不暂停服务。"""


class _Translator:
    MAX_CACHE = 5000

    def __init__(self):
        self.path = os.path.join(_DATA_DIR, "news_translations.json")
        self.cache = {}
        self.queue = []
        self.pending = set()
        self.down = {}  # 服务名 -> 暂停到的时间戳
        self.lock = threading.Lock()
        self.event = threading.Event()
        self.dirty = False
        self.last_error = ""
        try:
            with open(self.path, encoding="utf-8") as f:
                self.cache = json.load(f)
        except (OSError, ValueError):
            pass
        threading.Thread(target=self._loop, daemon=True, name="news-translate").start()

    @staticmethod
    def needs(text):
        if not text or _CJK.search(text):
            return False
        return len(re.findall(r"[A-Za-z]", text)) >= 6

    def get(self, text):
        return self.cache.get(text)

    def request(self, texts):
        with self.lock:
            for t in texts:
                if t not in self.cache and t not in self.pending:
                    self.pending.add(t)
                    self.queue.append(t)
        if self.queue:
            self.event.set()

    def _index(self, texts):
        """B站 Index-Translate：一次翻多行，按行对应。行数对不上就抛 _BadResult，改为逐条翻。"""
        prompt = ("请将以下每一行英文财经新闻标题分别翻译为简体中文。逐行对应输出，行数保持一致，"
                  "每行只输出译文，不要编号，不要任何解释。\n\n" + "\n".join(t.replace("\n", " ") for t in texts))
        out = self._index_call(prompt)
        rows = [x.strip() for x in out.split("\n") if x.strip()]
        if len(rows) != len(texts):
            raise _BadResult(f"Index-Translate 行数不符 {len(rows)}/{len(texts)}")
        return [re.sub(r"^\d+[.、)]\s*", "", x) for x in rows]

    def _index_call(self, prompt):
        payload = {"model": INDEX_MODEL, "messages": [{"role": "user", "content": prompt}],
                   "temperature": 0.3, "max_tokens": 2048, "stream": False,
                   "chat_template_kwargs": {"enable_thinking": False}}
        req = urllib.request.Request(INDEX_API, data=json.dumps(payload).encode(), headers={
            "Content-Type": "application/json", "User-Agent": "Index-Translate-Client/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.loads(r.read().decode("utf-8"))
        out = d["choices"][0]["message"]["content"] or ""
        return re.sub(r"<think>.*?</think>", "", out, flags=re.S).strip()

    def _google(self, text):
        url = ("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q="
               + urllib.parse.quote(text[:1000]))
        d = json.loads(_get(url, timeout=10))
        out = "".join(seg[0] for seg in d[0] if seg and seg[0]).strip()
        if not out:
            raise RuntimeError("Google: 空结果")
        return out

    def _pause(self, name, e):
        # 限流(429)歇 2 分钟，其他错误（连不上等）歇 10 分钟
        self.down[name] = time.time() + (120 if "429" in str(e) else 600)
        self.last_error = f"{name}: {type(e).__name__}: {e}"[:160]

    def _usable(self, name):
        return self.down.get(name, 0) <= time.time()

    def _translate_batch(self, texts):
        """返回 {原文: 译文}；没翻成的不在结果里。"""
        res = {}
        if self._usable("index"):
            try:
                for t, zh in zip(texts, self._index(texts)):
                    res[t] = zh
                return res
            except _BadResult:
                for t in texts:  # 批量对不上行，逐条再试
                    try:
                        res[t] = self._index([t])[0]
                    except _BadResult:
                        pass
                    except Exception as e:  # noqa: BLE001
                        self._pause("index", e)
                        break
            except Exception as e:  # noqa: BLE001
                self._pause("index", e)
        for t in texts:
            if t in res or not self._usable("google"):
                continue
            try:
                res[t] = self._google(t)
                time.sleep(0.3)
            except Exception as e:  # noqa: BLE001
                self._pause("google", e)
        return res

    def _all_down(self):
        return not self._usable("index") and not self._usable("google")


    def _loop(self):
        pool = ThreadPoolExecutor(max_workers=PARALLEL, thread_name_prefix="news-tr")
        while True:
            self.event.wait(30)
            self.event.clear()
            while True:
                with self.lock:
                    if not self.queue:
                        break
                    batches = []
                    while self.queue and len(batches) < PARALLEL:  # 后进先出：最新的标题先翻
                        batches.append(self.queue[-BATCH:])
                        del self.queue[-BATCH:]
                # 几批同时发出去，比一批一批排队快好几倍
                results = list(pool.map(self._translate_batch, batches))
                down = self._all_down()
                with self.lock:
                    for batch, got in zip(batches, results):
                        for t in batch:
                            if got.get(t) and _CJK.search(got[t]):
                                self.cache[t] = got[t]
                                self.dirty = True
                                self.pending.discard(t)
                            elif down:
                                self.queue.insert(0, t)  # 服务都暂停了，留着等恢复
                            else:
                                self.cache[t] = ""  # 翻不出中文，记下来不再重试
                                self.pending.discard(t)
                if any(results):
                    self.last_error = ""
                if down:
                    break
            self._save()

    def translate_text(self, text):
        """展开正文时按需翻译一段文字（同步，结果也存缓存）。"""
        text = text.strip()[:3000]
        key = "body:" + text
        if self.cache.get(key):
            return self.cache[key]
        zh = None
        if self._usable("index"):
            try:
                zh = self._index_call("请将以下英文翻译为简体中文，直接输出翻译结果，不要进行任何解释。\n\n" + text)
            except Exception as e:  # noqa: BLE001
                self._pause("index", e)
        if not zh and self._usable("google"):
            try:
                zh = self._google(text)
            except Exception as e:  # noqa: BLE001
                self._pause("google", e)
        if zh:
            with self.lock:
                self.cache[key] = zh
                self.dirty = True
            threading.Thread(target=self._save, daemon=True).start()
        return zh

    def _save(self):
        if not self.dirty:
            return
        with self.lock:
            if len(self.cache) > self.MAX_CACHE:
                self.cache = dict(list(self.cache.items())[-self.MAX_CACHE // 2:])
            data = json.dumps(self.cache, ensure_ascii=False)
            self.dirty = False
        try:
            os.makedirs(_DATA_DIR, exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(data)
            os.replace(tmp, self.path)
        except OSError:
            pass

    def apply(self, items):
        """给英文条目加 titleZh（已缓存的）并把缺的排进队列，最新的优先。"""
        want = []
        for it in items:
            head = it["title"] or it["text"]
            if not self.needs(head):
                continue
            zh = self.get(head)
            if zh:
                it["titleZh"] = zh
            else:
                want.append(head)
        if want:
            self.request(list(reversed(want)))
        with self.lock:
            busy = any(t > time.time() for t in self.down.values())
            return {"pending": len(self.pending), "error": self.last_error if busy else ""}


_tr = None


def _translator():
    global _tr
    if _tr is None:
        _tr = _Translator()
    return _tr


# ---------------- 汇总 ----------------
def _run(jobs):
    futs = {k: _POOL.submit(fn) for k, fn in jobs.items()}
    items, status = [], []
    for k, f in futs.items():
        try:
            got = [dict(x) for x in f.result(timeout=15)]  # 复制一份，去重/翻译不改动缓存里的原对象
            items += got
            status.append({"id": k, "ok": True, "count": len(got)})
        except Exception as e:  # noqa: BLE001
            status.append({"id": k, "ok": False, "error": f"{type(e).__name__}: {e}"[:200]})
    # 去重：同一条快讯常被多家同时发，按标题/正文前 24 个字（去掉标点）合并，保留最早发出的那条，
    # 其他来源记在 also 里，重要度取最高
    seen, first, uniq = set(), {}, []
    for it in sorted(items, key=lambda x: x["time"]):
        if it["id"] in seen:
            continue
        seen.add(it["id"])
        key = re.sub(r"[\W_]+", "", (it["title"] or it["text"]))[:24].lower()
        prev = first.get(key) if len(key) >= 8 else None
        if prev and abs(prev["time"] - it["time"]) < 3 * 3600:
            prev.setdefault("also", []).append(it["srcName"])
            prev.setdefault("alsoSrc", []).append(it["src"])
            prev["level"] = max(prev["level"], it["level"])
            continue
        first[key] = it
        uniq.append(it)
    uniq.reverse()
    return uniq, status


def handle(qs):
    def q(k, d=""):
        v = qs.get(k)
        return (v[0] if isinstance(v, list) else v) if v else d

    if q("tr_text"):  # 展开正文时点"翻译"
        zh = _translator().translate_text(q("tr_text"))
        return {"zh": zh} if zh else {"error": _translator().last_error or "翻译失败"}

    limit = max(1, min(int(q("limit", "150") or 150), 500))
    code = q("s").strip()
    if code:
        items, status = stock_news(code, q("n").strip())
        items = items[:limit]
        tr = _translator().apply(items) if q("tr", "1") != "0" else None
        return {"mode": "stock", "symbol": code, "items": items, "sources": status,
                "ts": int(time.time()), "translate": tr}

    want = [s for s in q("src").split(",") if s in SOURCES] or list(SOURCES)
    jobs = {s: (lambda s=s: _cached(("src", s), SOURCES[s][2], SOURCES[s][1])) for s in want}
    items, status = _run(jobs)
    for st in status:
        st["name"] = SOURCES[st["id"]][0]
    items = items[:limit]
    tr = _translator().apply(items) if q("tr", "1") != "0" else None
    return {"mode": "flash", "items": items, "sources": status, "ts": int(time.time()), "translate": tr,
            "available": [{"id": k, "name": v[0]} for k, v in SOURCES.items()]}


def _warmup():
    """服务一启动就先拉一遍快讯并开始翻译，打开界面时标题基本已经翻好。"""
    try:
        handle({})
    except Exception:  # noqa: BLE001
        pass


if __name__ != "__main__":
    _t = threading.Timer(0.5, _warmup)
    _t.daemon = True
    _t.start()


if __name__ == "__main__":  # 命令行自测：python news.py [代码 名称]
    import sys
    args = {"s": [sys.argv[1]], "n": [sys.argv[2] if len(sys.argv) > 2 else ""]} if len(sys.argv) > 1 else {}
    r = handle(args)
    print(json.dumps(r["sources"], ensure_ascii=False))
    for it in r["items"][:15]:
        t = time.strftime("%m-%d %H:%M", time.localtime(it["time"]))
        print(f"{t} [{it['srcName']}] L{it['level']} {it['title'] or it['text'][:60]}")
