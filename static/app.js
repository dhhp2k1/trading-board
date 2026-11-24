/* 交易看板原型前端 */
const $ = (s) => document.querySelector(s);
const LS_KEY = "board.v1";

const DEFAULT_STATE = {
  ticker: [
    ["sh000001", "上证指数"], ["sz399001", "深证成指"], ["sz399006", "创业板指"], ["sh000300", "沪深300"],
    ["hkHSI", "恒生指数"], ["yf:^DJI", "道琼斯"], ["yf:^IXIC", "纳斯达克"], ["yf:^GSPC", "标普500"],
    ["yf:^N225", "日经225"], ["yf:^KS11", "韩国KOSPI"], ["yf:^GDAXI", "德国DAX"], ["yf:^FTSE", "富时100"],
    ["yf:GC=F", "黄金"], ["yf:CL=F", "原油"], ["yf:CNH=X", "美元/离岸人民币"], ["yf:BTC-USD", "比特币"],
  ],
  groups: { "自选": ["sh600519", "sz300750", "hk00700", "yf:AAPL", "yf:NVDA"] },
  group: "自选",
  selected: "sh600519",
  period: "day",
  ctype: "candle",
  interval: 3000,
  redUp: true,
  sort: null,
};

let MINI = new URLSearchParams(location.search).has("mini");   // 小窗模式（同一窗口原地切换）
let state = load();
let quotes = {};
let timer = null;
let watchQuoteRequest = 0;
let watchQuoteCompleted = 0;
let watchQuoteSnapshot = null;

function load() {
  try { return Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return structuredClone(DEFAULT_STATE); }
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

/* ---------- 代码识别：把各种写法统一成内部代码 ---------- */
const TV_INDEX = {
  "TVC:DJI": "yf:^DJI", "DJ:DJI": "yf:^DJI", "NASDAQ:IXIC": "yf:^IXIC", "SP:SPX": "yf:^GSPC",
  "TVC:SPX": "yf:^GSPC", "TVC:NI225": "yf:^N225", "XETR:DAX": "yf:^GDAXI", "TVC:DAX": "yf:^GDAXI",
  "TVC:UKX": "yf:^FTSE", "TVC:HSI": "hkHSI", "HSI:HSI": "hkHSI", "TVC:GOLD": "yf:GC=F",
  "TVC:USOIL": "yf:CL=F", "KRX:KOSPI": "yf:^KS11", "TVC:KOSPI": "yf:^KS11",
};
const US_EX = new Set(["NASDAQ", "NYSE", "AMEX", "NYSEARCA", "BATS", "ARCA", "OTC", "CBOE"]);
const YF_SUFFIX = { TSE: ".T", LSE: ".L", XETR: ".DE", EURONEXT: ".PA", ASX: ".AX", TSX: ".TO", KRX: ".KS", TWSE: ".TW" };

function aShare(code) {
  if (/^[569]/.test(code)) return "sh" + code;
  if (/^[0123]/.test(code)) return "sz" + code;
  if (/^[48]/.test(code)) return "bj" + code;
  return null;
}

function normSymbol(raw) {
  let s = (raw || "").trim().replace(/^["']|["']$/g, "");
  if (!s) return null;
  if (/^(sh|sz|bj)\d{6}$/i.test(s)) return s.toLowerCase();
  if (/^hk[A-Z\d]+$/i.test(s)) return "hk" + s.slice(2).toUpperCase().padStart(5, "0").replace(/^0+(?=[A-Z])/, "");
  if (/^yf:/i.test(s)) return "yf:" + s.slice(3).toUpperCase();
  const U = s.toUpperCase();
  if (TV_INDEX[U]) return TV_INDEX[U];
  const m = U.match(/^([A-Z_]+):(.+)$/);
  if (m) {
    const [, ex, sym] = m;
    if (ex === "SSE") return "sh" + sym;
    if (ex === "SZSE") return "sz" + sym;
    if (ex === "BSE") return "bj" + sym;
    if (ex === "HKEX") return "hk" + sym.padStart(5, "0");
    if (US_EX.has(ex)) return "yf:" + sym.replace(".", "-");
    if (YF_SUFFIX[ex]) return "yf:" + sym + YF_SUFFIX[ex];
    return "yf:" + sym;
  }
  let mm;
  if ((mm = U.match(/^(\d{6})\.(SS|SH)$/))) return "sh" + mm[1];
  if ((mm = U.match(/^(\d{6})\.SZ$/))) return "sz" + mm[1];
  if ((mm = U.match(/^(\d{1,5})\.HK$/))) return "hk" + mm[1].padStart(5, "0");
  if (/^\d{6}$/.test(U)) return aShare(U);
  if (/^\d{1,5}$/.test(U)) return "hk" + U.padStart(5, "0");
  if (/^[\^A-Z][A-Z0-9.\-=^]*$/.test(U)) return "yf:" + U;
  return null;
}

function displayCode(sym) {
  if (sym.startsWith("yf:")) return sym.slice(3);
  return sym.slice(0, 2).toUpperCase() + " " + sym.slice(2);
}

/* ---------- 格式化 ---------- */
function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e8) return (v / 1e8).toFixed(2) + "亿";
  if (a >= 1e4 && d === 0) return (v / 1e4).toFixed(2) + "万";
  return Number(v).toFixed(a < 10 ? Math.max(d, 3) : d);
}
const pctStr = (p) => (p == null ? "—" : (p > 0 ? "+" : "") + p.toFixed(2) + "%");
const cls = (p) => (p > 0 ? "up" : p < 0 ? "down" : "");
const displayDate = (s) => String(s ?? "").replace(/^(\d{4})[-/](\d{2})[-/](\d{2})(?=$|[ T])/, "$1$2$3");

/* ---------- 行情刷新 ---------- */
function ovList() { return ((state.ovMap || {})[state.selected]) || []; }
function allSymbols() {
  const set = new Set(tickerItems().map((t) => t[0]));
  (state.groups[state.group] || []).forEach((s) => set.add(s));
  if (state.selected) set.add(state.selected);
  ovList().forEach((s) => set.add(s));
  return [...set];
}

async function refresh() {
  const request = ++watchQuoteRequest;
  const group = state.group;
  try {
    const syms = allSymbols();
    const r = await fetch("/api/quotes?s=" + encodeURIComponent(syms.join(",")));
    const data = await r.json();
    const prev = quotes;
    if (request > watchQuoteCompleted) {
      watchQuoteCompleted = request;
      watchQuoteSnapshot = r.ok ? { group, quotes: data } : null;
    }
    quotes = Object.assign({}, quotes, data);
    renderTicker();
    renderWatch(prev);
    renderDetail();
    patchLastBar();
    if (ovList().length) renderOvChips();
    $("#status").textContent = "已更新 " + new Date().toLocaleTimeString("zh-CN", { hour12: false }) + " · 报价：腾讯（A股/港股）、雅虎（美股/全球） · K线：东方财富，失败时回退腾讯/雅虎";
  } catch (e) {
    if (request > watchQuoteCompleted) {
      watchQuoteCompleted = request;
      watchQuoteSnapshot = null;
      notifyGroupBrief(state.groups[state.group] || []);
    }
    $("#status").textContent = "刷新失败：" + e;
  }
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden) refresh(); }, state.interval);
}

/* ---------- 美股时段判断：常规时段外，美股指数自动换成股指期货（夜盘） ---------- */
const US_FUT = { "yf:^DJI": ["yf:YM=F", "道指期货"], "yf:^IXIC": ["yf:NQ=F", "纳指期货"], "yf:^GSPC": ["yf:ES=F", "标普期货"],
  "yf:^RUT": ["yf:RTY=F", "罗素期货"] };
function usSession() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short",
    hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const m = (+p.hour % 24) * 60 + +p.minute;
  if (p.weekday === "Sat" || p.weekday === "Sun") return "closed";
  if (m >= 570 && m < 960) return "regular";
  if (m >= 240 && m < 570) return "pre";
  if (m >= 960 && m < 1200) return "post";
  return "overnight";
}
const SESSION_NAME = { regular: "美股盘中", pre: "美股盘前", post: "美股盘后", overnight: "美股夜盘", closed: "美股休市" };
function tickerItems() {
  const swap = usSession() !== "regular";
  return state.ticker.map(([s, n]) => (swap && US_FUT[s] ? [US_FUT[s][0], US_FUT[s][1], true] : [s, n, false]));
}

/* ---------- 顶部指数条 ---------- */
function renderTicker() {
  $("#ticker").innerHTML = tickerItems().map(([s, n, fut]) => {
    const q = quotes[s] || {};
    return `<div class="tk${fut ? " fut" : ""}" data-s="${s}" title="${fut ? "美股常规时段外，自动显示股指期货（近 24 小时交易）" : ""}"><span class="n">${n}${fut ? "<sup>夜</sup>" : ""}</span>
      <span class="p ${cls(q.pct)}">${fmt(q.price)} <small>${pctStr(q.pct)}</small></span></div>`;
  }).join("");
}
$("#ticker").addEventListener("click", (e) => {
  const el = e.target.closest(".tk"); if (el) select(el.dataset.s);
});

/* ---------- 自选列表 ---------- */
function renderTabs() {
  $("#groupTabs").innerHTML = Object.keys(state.groups).map((g) => {
    const label = watchText(g);
    const active = g === state.group;
    return `<button data-g="${label}" title="${label}" aria-pressed="${active}" class="${active ? "on" : ""}">${label} <small class="muted">${state.groups[g].length}</small></button>`;
  }).join("");
}
$("#groupTabs").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  state.group = b.dataset.g; save(); renderTabs(); renderWatch(); refresh();
});
$("#groupTabs").addEventListener("dblclick", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const g = b.dataset.g;
  const n = prompt(`重命名分组「${g}」（清空则删除该分组）`, g);
  if (n === null) return;
  if (!n.trim()) {
    if (Object.keys(state.groups).length <= 1) return;
    delete state.groups[g]; state.group = Object.keys(state.groups)[0];
  } else if (n !== g) {
    state.groups[n] = state.groups[g]; delete state.groups[g]; state.group = n;
  }
  save(); renderTabs(); renderWatch();
});

function extTag(q) {
  if (!q.ext || usSession() === "regular") return "";
  const label = watchText(q.ext.label);
  return `<span class="ext ${cls(q.ext.pct)}" title="${label} ${fmt(q.ext.price)}（${watchText(displayDate(q.ext.time))}）">${label}${pctStr(q.ext.pct)}</span>`;
}

function premTag(q) {
  if (q.premium == null) return "";
  return `<span class="ext prem ${cls(q.premium)}" title="${q.iopv ? "IOPV " + fmt(q.iopv, 4) + "，" : ""}溢价率 ${pctStr(q.premium)}">溢${pctStr(q.premium)}</span>`;
}
function watchText(value) {
  return String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
const WATCH_ALIASES = {
  "yf:AAPL": "Apple",
  "yf:NVDA": "NVIDIA",
  "yf:QQQ": "Invesco QQQ",
  "yf:XBI": "SPDR 生物科技",
  "yf:SOXX": "iShares 半导体",
  "yf:SPY": "SPDR 标普500",
};
function watchName(symbol, quote) {
  const code = displayCode(symbol);
  const name = quote.name || quote.longName || code;
  if (!symbol.startsWith("yf:") && !symbol.startsWith("hk")) return name;
  if (WATCH_ALIASES[symbol]) return WATCH_ALIASES[symbol];
  const short = name
    .replace(/^State Street\s+(?=SPDR\b)/i, "")
    .replace(/,\s*Series\s+\w+$/i, "")
    .replace(/(?:,?\s+(?:Incorporated|Corporation|Company|Limited|Inc\.?|Corp\.?|Ltd\.?|PLC|ETF|Fund|Trust|Co\.?))+$/i, "");
  if (short.length <= 18) return short || code;
  const words = short.split(/\s+/);
  const first = words.shift();
  if (first.length > 18) return code;
  let label = first;
  for (const word of words) {
    if (label.length + word.length + 1 > 18) break;
    label += " " + word;
  }
  return label === first && words.length ? label + " · " + code : label;
}
function notifyGroupBrief(symbols) {
  document.dispatchEvent(new CustomEvent("board:watch-quotes", {
    detail: { symbols, quotes: watchQuoteSnapshot?.group === state.group ? watchQuoteSnapshot.quotes : {},
      reference: state.groupReference },
  }));
}

document.addEventListener("board:group-reference", (event) => {
  state.groupReference = event.detail;
  save();
});

function renderWatch(prev = {}) {
  let list = [...(state.groups[state.group] || [])];
  if (state.sort) {
    const { key, dir } = state.sort;
    list.sort((a, b) => {
      const qa = quotes[a] || {}, qb = quotes[b] || {};
      const va = key === "name" ? watchName(a, qa) : qa[key] ?? -Infinity;
      const vb = key === "name" ? watchName(b, qb) : qb[key] ?? -Infinity;
      return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
    });
  }
  document.querySelectorAll("#watch [data-sort]").forEach((button) => {
    const header = button.closest("th");
    if (button.dataset.sort === state.sort?.key) {
      header.setAttribute("aria-sort", state.sort.dir > 0 ? "ascending" : "descending");
    } else {
      header.removeAttribute("aria-sort");
    }
  });
  const L = look();
  const columns = L.spark ? 4 : 3;
  $("#watchSparkHead").hidden = !L.spark;
  $("#watch tbody").innerHTML = list.length ? list.map((s) => {
    const q = quotes[s] || {};
    const p = prev[s];
    const flash = p && q.price != null && p.price != null && q.price !== p.price
      ? (q.price > p.price ? "flash-up" : "flash-down") : "";
    const symbol = watchText(s), code = watchText(displayCode(s));
    const name = watchText((q.error ? "⚠ " : "") + watchName(s, q));
    const fullName = watchText(q.longName || q.name || displayCode(s));
    const price = fmt(q.price);
    const move = q.change == null ? "" : (q.change > 0 ? "+" : "") + fmt(q.change);
    const extended = extTag(q);
    const premium = L.prem ? premTag(q) : "";
    return `<tr role="row" data-s="${symbol}" class="${s === state.selected ? "sel" : ""} ${flash}">
      <td role="cell" class="watch-symbol">
        <div class="watch-name-line">
          <span class="watch-name" title="${fullName}">${name}</span>
          <button type="button" class="watch-remove" data-del="${symbol}" title="移出当前分组" aria-label="移出 ${code}">×</button>
        </div>
        <div class="watch-meta">
          <span class="watch-code" title="${code}">${code}</span>
          ${extended && premium ? premium : ""}
        </div>
        ${L.range ? rangeBar(q) : ""}
      </td>
      ${L.spark ? `<td role="cell" class="watch-spark" title="日内走势">${sparkSvg(s, q)}</td>` : ""}
      <td role="cell" class="watch-quote">
        <div class="watch-price${price.length > 9 ? " long" : ""}" title="${price}">${price}</div>
        ${L.change && move ? `<div class="watch-change ${cls(q.pct)}" title="${move}">${move}</div>` : ""}
      </td>
      <td role="cell" class="watch-performance">
        ${L.pill ? pill(q.pct) : `<span class="watch-pct ${cls(q.pct)}" title="${pctStr(q.pct)}">${pctStr(q.pct)}</span>`}
        ${extended || premium}
      </td></tr>`;
  }).join("") : `<tr role="row" class="watch-empty"><td role="cell" colspan="${columns}">此分组暂无标的</td></tr>`;
  $("#watchCount").textContent = `${list.length} 只`;
  if (L.view === "heat") renderHeat(list);
  needSparks(list);
  notifyGroupBrief(list);
}

/* ---------- 外观：主题 + 自选栏显示方式 ---------- */
const LOOK_DEF = { theme: "bloomberg", view: "list", spark: true, range: true, pill: true, change: true, prem: true, dense: false };
function look() { return Object.assign({}, LOOK_DEF, state.look || {}); }
const THEMES = {
  bloomberg: { name: "彭博琥珀", sw: ["#000", "#ff8c00", "#f4a81d"] },
  midnight: { name: "午夜深蓝", sw: ["#0a1020", "#1e88e5", "#9fc3ff"] },
  graphite: { name: "石墨灰", sw: ["#131722", "#2962ff", "#d1d4dc"] },
  matrix: { name: "终端绿", sw: ["#020a04", "#19c37d", "#7dffb0"] },
};
function upDownRGB(pct) {
  const up = state.redUp ? [255, 59, 59] : [38, 208, 124], dn = state.redUp ? [38, 208, 124] : [255, 59, 59];
  return pct >= 0 ? up : dn;
}
function pill(pct) {
  const a = pct == null || Math.abs(pct) < 0.005 ? 0 : Math.min(.24, .08 + Math.abs(pct) / 75);
  const c = upDownRGB(pct);
  const bg = a ? `rgba(${c.join(",")},${a.toFixed(2)})` : "var(--input)";
  const value = pctStr(pct);
  return `<span class="watch-pct pill ${cls(pct)}" style="background:${bg}" title="${value}">${value}</span>`;
}
function rangeBar(q) {
  if (![q.high, q.low, q.price].every(Number.isFinite) || q.high <= q.low) return "";
  const pos = (v) => Math.max(0, Math.min(100, (v - q.low) / (q.high - q.low) * 100));
  const c = upDownRGB(q.pct || 0);
  const hasOpen = Number.isFinite(q.open) && q.open > 0;
  const open = hasOpen ? `<i class="open" style="left:${pos(q.open)}%"></i>` : "";
  const label = `最低 ${fmt(q.low)} · 最高 ${fmt(q.high)}${hasOpen ? " · 今开 " + fmt(q.open) : ""} · 最新 ${fmt(q.price)}`;
  return `<div class="rng" role="img" aria-label="${label}" title="${label}"><b style="width:${pos(q.price)}%;background:rgba(${c.join(",")},.55)"></b>${open}<i class="now" style="left:${pos(q.price)}%"></i></div>`;
}

/* 自选分时：开盘换日或首批分钟线缺失时加快重试。 */
const sparkData = {}, sparkAt = {};
let sparkLoading = false;
function needSparks(list) {
  if (sparkLoading || (!look().spark && look().view !== "heat")) return;
  const now = Date.now();
  const want = list.map((s) => ({ s, day: quotes[s]?.sparkDay })).filter(({ s, day }) => {
    const last = sparkAt[s], data = sparkData[s];
    const early = !data || data.pts.length < 2 || (day && day > data.day);
    return !last || (day && day !== last.day) || now - last.at >= (early ? 12000 : 45000);
  });
  if (!want.length) return;
  sparkLoading = true;
  setTimeout(() => loadSparks(want), 200);
}
async function loadSparks(want) {
  for (let i = 0; i < want.length; i += 20) {
    const batch = want.slice(i, i + 20);
    try {
      const response = await fetch("/api/spark?s=" + encodeURIComponent(batch.map(({ s }) => s).join(",")));
      if (response.ok) {
        const data = await response.json();
        for (const { s } of batch) {
          const next = data[s];
          if (next?.pts?.length && (!sparkData[s] || next.last >= sparkData[s].last)) sparkData[s] = next;
        }
      }
    } catch (_) { /* 短暂断连时保留最后一份可用数据。 */ }
    const at = Date.now();
    for (const { s, day } of batch) sparkAt[s] = { at, day };
    if (i + 20 < want.length) renderWatch();
  }
  sparkLoading = false;
  renderWatch();
}
function sparkSvg(s, q, heat = false) {
  const d = sparkData[s];
  const hasQuote = q.sparkDay && Number.isFinite(q.price) && Number.isFinite(q.timestamp);
  const isNewSession = hasQuote && (!d || q.sparkDay > d.day);
  let pts = d?.pts.slice() || [];
  if (isNewSession) {
    pts = Number.isFinite(q.open) && q.open > 0 && q.open !== q.price ? [q.open, q.price] : [q.price];
  } else if (hasQuote && q.sparkDay === d?.day && q.timestamp >= d.last) {
    if (Math.floor(q.timestamp / 60) === Math.floor(d.last / 60)) pts[pts.length - 1] = q.price;
    else pts.push(q.price);
  }
  const className = heat ? "sp tsp" : "sp";
  if (!pts.length) return `<svg class="${className}"></svg>`;
  const hasSessionBaseline = hasQuote && (isNewSession || q.sparkDay === d?.day) && Number.isFinite(q.prevClose) && q.prevClose !== 0;
  const baseline = hasSessionBaseline ? q.prevClose : isNewSession ? null : d?.prev;
  const base = Number.isFinite(baseline) && baseline !== 0 ? baseline : pts[0];
  let lo = Math.min(base, ...pts), hi = Math.max(base, ...pts);
  if (hi === lo) { hi += 1e-9; lo -= 1e-9; }
  const W = 64, H = 18, n = Math.max(pts.length - 1, 1);
  const y = (v) => (H - 2 - (v - lo) / (hi - lo) * (H - 4)).toFixed(1);
  const line = pts.map((v, i) => `${(i / n * W).toFixed(1)},${y(v)}`).join(" ");
  const c = `rgb(${upDownRGB(pts[pts.length - 1] - base).join(",")})`;
  const id = "g" + (heat ? "heat" : "list") + s.replace(/[^a-z0-9]/gi, "");
  return `<svg class="${className}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line x1="0" x2="${W}" y1="${y(base)}" y2="${y(base)}" class="base"/>
    ${pts.length === 1 ? `<circle cx="${W / 2}" cy="${y(pts[0])}" r="2" fill="${c}"/>` : `
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="0,${H} ${line} ${W},${H}" fill="url(#${id})"/>
      <polyline points="${line}" fill="none" stroke="${c}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`}</svg>`;
}

/* 热力图视图：方块颜色深浅 = 涨跌幅大小 */
function renderHeat(list) {
  $("#heat").innerHTML = list.map((s) => {
    const q = quotes[s] || {}, pct = q.pct;
    const a = pct == null ? 0 : Math.min(0.95, 0.18 + Math.abs(pct) / 5), c = upDownRGB(pct || 0);
    const bg = pct == null || Math.abs(pct) < 0.005 ? "rgba(128,128,128,.18)" : `rgba(${c.join(",")},${a.toFixed(2)})`;
    return `<div class="tile ${s === state.selected ? "sel" : ""}" data-s="${s}" style="background:${bg}">
      <div class="tn" title="${watchText(q.longName || q.name || displayCode(s))}">${watchText(watchName(s, q))}</div>
      <div class="tp">${pctStr(pct)}</div>
      <div class="tq">${fmt(q.price)}${q.premium != null ? ` · 溢${pctStr(q.premium)}` : ""}</div>
      ${sparkSvg(s, q, true)}</div>`;
  }).join("");
}
$("#heat").addEventListener("click", (e) => { const t = e.target.closest(".tile"); if (t) select(t.dataset.s); });

function applyLook() {
  const L = look();
  document.body.dataset.theme = L.theme;
  ["spark", "range", "pill", "change", "dense"].forEach((k) => document.body.classList.toggle("wl-no" + k, !L[k]));
  document.body.classList.toggle("wl-dense", L.dense);
  document.body.classList.toggle("wl-heat", L.view === "heat");
  // 图表配色跟随主题
  const cs = getComputedStyle(document.body);
  const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
  if (typeof chart !== "undefined" && chart) {
    const axis = { axisLine: { color: v("--line", "#2a2a2a") }, tickText: { color: v("--axis", "#c9a35a") } };
    const cross = { line: { color: v("--head", "#ff8c00") }, text: { backgroundColor: v("--head", "#ff8c00"), color: "#000" } };
    $("#chart").style.backgroundColor = v("--bg", "#000");
    chart.setStyles({
      grid: { vertical: { color: v("--grid", "#161616") }, horizontal: { color: v("--grid", "#161616") } },
      xAxis: axis, yAxis: axis, crosshair: { vertical: cross, horizontal: cross },
      separator: { color: v("--line", "#2a2a2a") },
    });
  }
}
function setLook(patch) { state.look = Object.assign(look(), patch); save(); applyLook(); renderLookPop(); renderWatch(); }
function renderLookPop() {
  const L = look();
  $("#lkThemes").innerHTML = Object.entries(THEMES).map(([k, t]) =>
    `<button data-t="${k}" class="${L.theme === k ? "on" : ""}"><span class="sw">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span>${t.name}</button>`).join("");
  document.querySelectorAll("#lkView button").forEach((b) => b.classList.toggle("on", b.dataset.v === L.view));
  document.querySelectorAll("#lookPop input[data-o]").forEach((cb) => (cb.checked = !!L[cb.dataset.o]));
}
$("#btnLook").onclick = (e) => {
  e.stopPropagation();
  const p = $("#lookPop"), on = p.style.display !== "block";
  p.style.display = on ? "block" : "none"; if (on) renderLookPop();
};
$("#lookPop").addEventListener("click", (e) => {
  e.stopPropagation();
  const t = e.target.closest("[data-t]"); if (t) return setLook({ theme: t.dataset.t });
  const v = e.target.closest("[data-v]"); if (v) return setLook({ view: v.dataset.v });
});
$("#lookPop").addEventListener("change", (e) => { const o = e.target.dataset.o; if (o) setLook({ [o]: e.target.checked }); });
document.addEventListener("click", (e) => { if (!e.target.closest("#lookPop")) $("#lookPop").style.display = "none"; });
$("#watch tbody").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]")?.dataset.del;
  if (del) {
    state.groups[state.group] = state.groups[state.group].filter((s) => s !== del);
    save(); renderTabs(); renderWatch(); return;
  }
  const tr = e.target.closest("tr[data-s]"); if (tr) select(tr.dataset.s);
});
$("#watch thead").addEventListener("click", (e) => {
  const k = e.target.dataset.sort; if (!k) return;
  if (state.sort && state.sort.key === k) state.sort = state.sort.dir === -1 ? { key: k, dir: 1 } : null;
  else state.sort = { key: k, dir: -1 };
  save(); renderWatch();
});

function addSymbols(syms, group = state.group) {
  state.groups[group] = state.groups[group] || [];
  let n = 0;
  for (const s of syms) if (s && !state.groups[group].includes(s)) { state.groups[group].push(s); n++; }
  save();
  return n;
}

/* 添加框：回车直接按代码识别；输入中文/拼音时用搜索建议 */
let sugTimer;
$("#addInput").addEventListener("input", (e) => {
  clearTimeout(sugTimer);
  const q = e.target.value.trim();
  if (!q) { $("#suggest").style.display = "none"; return; }
  sugTimer = setTimeout(async () => {
    try {
      const r = await (await fetch("/api/search?q=" + encodeURIComponent(q))).json();
      if (!Array.isArray(r) || !r.length) { $("#suggest").style.display = "none"; return; }
      const cur = state.groups[state.group] || [];
      $("#suggest").innerHTML = r.map((x) => `<div data-s="${x.symbol}" class="${cur.includes(x.symbol) ? "in" : ""}"><span class="sn">${x.name} <span class="muted">${displayCode(x.symbol)}</span></span><span class="sadd" title="加入「${state.group}」">${cur.includes(x.symbol) ? "已在自选" : "＋自选"}</span></div>`).join("");
      $("#suggest").style.display = "block";
    } catch { /* 搜索失败时忽略，回车仍可按代码添加 */ }
  }, 250);
});
$("#suggest").addEventListener("click", (e) => {
  const d = e.target.closest("div[data-s]"); if (!d) return;
  const s = d.dataset.s;
  if (e.target.closest(".sadd")) {   // 只有点「＋自选」才加入分组
    if (addSymbols([s])) toast(`已加入「${state.group}」`); else toast("已在当前分组");
    renderTabs(); renderWatch(); refresh();
    d.classList.add("in"); return;
  }
  $("#addInput").value = ""; $("#suggest").style.display = "none";
  select(s);                        // 搜索 = 打开图表看看，不加自选
});
$("#addInput").addEventListener("keydown", (e) => {
  if (e.key === "Escape") { $("#suggest").style.display = "none"; return; }
  if (e.key !== "Enter") return;
  const first = $("#suggest").style.display === "block" && $("#suggest div[data-s]");
  const s = normSymbol(e.target.value) || (first && first.dataset.s);
  if (!s) return;
  e.target.value = ""; $("#suggest").style.display = "none";
  select(s);
});
$("#cAdd").onclick = () => {
  const s = state.selected; if (!s) return;
  addSymbols([s]); toast(`已加入「${state.group}」`); renderTabs(); renderWatch(); renderDetail(); refresh();
};

$("#btnNewGroup").onclick = () => {
  const n = prompt("新分组名称"); if (!n || state.groups[n]) return;
  state.groups[n] = []; state.group = n; save(); renderTabs(); renderWatch();
};

/* ---------- 整理自选：批量勾选删除 / 移动 / 清空 ---------- */
let mgSel = new Set(), mgLast = -1;
function mgList() { return state.groups[$("#mgGroup").value] || []; }
function mgBadSym(s) { const q = quotes[s]; return !q || q.error || (q.price == null && !q.name); }
async function openManage(group = state.group) {
  $("#mgGroup").innerHTML = Object.keys(state.groups).map((g) => `<option value="${g}">${g}（${state.groups[g].length}）</option>`).join("");
  $("#mgGroup").value = group; mgSel = new Set(); mgLast = -1;
  $("#manageDlg").showModal(); renderManage();
  await mgFetch();
}
async function mgFetch() {
  const need = mgList().filter((s) => !quotes[s]);
  if (!need.length) return;
  $("#mgSummary").textContent = "正在获取行情…";
  for (let i = 0; i < need.length; i += 60) {   // 分批查，免得地址过长
    try {
      const d = await (await fetch("/api/quotes?s=" + encodeURIComponent(need.slice(i, i + 60).join(",")))).json();
      Object.assign(quotes, d);
    } catch (e) { /* 查不到的会显示为无行情 */ }
  }
  need.forEach((s) => { if (!quotes[s]) quotes[s] = { error: "无数据" }; });
  renderManage();
}
function renderManage() {
  const list = mgList();
  const bad = list.filter(mgBadSym).length;
  $("#mgTable tbody").innerHTML = list.map((s, i) => {
    const q = quotes[s] || {}, b = quotes[s] && mgBadSym(s);
    const others = Object.keys(state.groups).filter((g) => g !== $("#mgGroup").value && state.groups[g].includes(s));
    return `<tr data-i="${i}" class="${mgSel.has(s) ? "on" : ""}"><td><input type="checkbox" ${mgSel.has(s) ? "checked" : ""}></td>
      <td>${q.name || "—"}</td><td>${displayCode(s)}</td><td class="r ${cls(q.pct)}">${fmt(q.price)}</td>
      <td>${!quotes[s] ? '<span class="muted">…</span>' : b ? '<span class="down">无行情，可能是错误代码</span>' : others.length ? `<span class="muted">也在「${others.join("、")}」</span>` : ""}</td></tr>`;
  }).join("") || '<tr><td colspan="5" class="muted" style="padding:12px">这个分组是空的</td></tr>';
  $("#mgSummary").innerHTML = `共 ${list.length} 个${bad ? `，<span class="down">${bad} 个无行情</span>` : ""}，已选 <b>${mgSel.size}</b> 个`;
  $("#mgDel").textContent = `删除所选（${mgSel.size}）`;
  $("#mgDel").disabled = $("#mgMove").disabled = !mgSel.size;
  $("#mgClear").disabled = !list.length;
}
$("#btnManage").onclick = () => openManage();
$("#mgClose").onclick = () => $("#manageDlg").close();
$("#manageDlg").addEventListener("close", () => { renderTabs(); renderWatch(); refresh(); });
$("#mgGroup").onchange = () => { mgSel = new Set(); mgLast = -1; $("#mgMoveTo").style.display = "none"; renderManage(); mgFetch(); };
$("#mgTable tbody").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-i]"); if (!tr) return;
  const list = mgList(), i = +tr.dataset.i, on = !mgSel.has(list[i]);
  const [a, b] = e.shiftKey && mgLast >= 0 ? [Math.min(mgLast, i), Math.max(mgLast, i)] : [i, i];
  for (let k = a; k <= b; k++) on ? mgSel.add(list[k]) : mgSel.delete(list[k]);
  mgLast = i; renderManage();
});
$("#mgAll").onclick = () => { mgSel = new Set(mgList()); renderManage(); };
$("#mgNone").onclick = () => { mgSel = new Set(); renderManage(); };
$("#mgInv").onclick = () => { mgSel = new Set(mgList().filter((s) => !mgSel.has(s))); renderManage(); };
$("#mgBad").onclick = () => { mgSel = new Set(mgList().filter((s) => quotes[s] && mgBadSym(s))); renderManage();
  if (!mgSel.size) toast("没有无行情的代码"); };
$("#mgDel").onclick = () => {
  const g = $("#mgGroup").value;
  if (!confirm(`从「${g}」删除选中的 ${mgSel.size} 个标的？`)) return;
  state.groups[g] = state.groups[g].filter((s) => !mgSel.has(s));
  toast(`已删除 ${mgSel.size} 个`); mgSel = new Set(); save(); openManage(g);
};
$("#mgClear").onclick = () => {
  const g = $("#mgGroup").value;
  if (!confirm(`清空分组「${g}」里的全部 ${state.groups[g].length} 个标的？`)) return;
  state.groups[g] = []; mgSel = new Set(); save(); openManage(g);
};
$("#mgMove").onclick = () => {
  const g = $("#mgGroup").value, sel = $("#mgMoveTo");
  sel.innerHTML = '<option value="">选择目标分组…</option>' + Object.keys(state.groups).filter((x) => x !== g)
    .map((x) => `<option value="${x}">${x}</option>`).join("") + '<option value="__new">新建分组…</option>';
  sel.style.display = ""; sel.focus();
};
$("#mgMoveTo").onchange = (e) => {
  let to = e.target.value; if (!to) return;
  const g = $("#mgGroup").value;
  if (to === "__new") { to = (prompt("新分组名称") || "").trim(); if (!to) return; state.groups[to] = state.groups[to] || []; }
  const moved = mgList().filter((s) => mgSel.has(s));
  state.groups[g] = state.groups[g].filter((s) => !mgSel.has(s));
  moved.forEach((s) => { if (!state.groups[to].includes(s)) state.groups[to].push(s); });
  toast(`已移动 ${moved.length} 个到「${to}」`); mgSel = new Set(); save(); e.target.style.display = "none"; openManage(g);
};

/* ---------- 导入 / 导出 ---------- */
/* ---------- 导入：先解析成预览行，用户确认后才写入 ---------- */
const MARKET_PREFIX = [[/上海|沪市|上证|SSE|SH/i, "sh"], [/深圳|深市|深证|SZSE|SZ/i, "sz"], [/北京|北交|BSE|BJ/i, "bj"],
  [/港|HK/i, "hk"]];
function marketName(sym) {
  return { sh: "上海", sz: "深圳", bj: "北京", hk: "香港" }[sym.slice(0, 2)] || (sym.startsWith("yf:") ? "海外" : "");
}

/* 同花顺等券商软件复制出来的表格：有"证券代码"表头，制表符分隔 */
function parseTable(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const hi = lines.findIndex((l) => /证券代码|股票代码|代码/.test(l) && l.includes("\t"));
  if (hi < 0) return null;
  const head = lines[hi].split("\t").map((x) => x.trim());
  const col = (re) => head.findIndex((h) => re.test(h));
  const ci = col(/^(证券代码|股票代码|代码)$/), ni = col(/^(证券名称|股票名称|名称)$/), mi = col(/交易市场|市场/);
  if (ci < 0) return null;
  const rows = [];
  for (const l of lines.slice(hi + 1)) {
    const c = l.split("\t").map((x) => x.trim());
    const code = (c[ci] || "").replace(/^'/, "");
    if (!code) continue;
    const name = ni >= 0 ? c[ni] || "" : "";
    const mk = mi >= 0 ? (c[mi] || "").normalize("NFKC") : "";
    let sym = null;
    const pref = MARKET_PREFIX.find(([re]) => re.test(mk));
    if (pref && /^\d+$/.test(code)) sym = pref[1] === "hk" ? "hk" + code.padStart(5, "0") : pref[1] + code.padStart(6, "0");
    else sym = normSymbol(code);
    rows.push({ raw: code, name, symbol: sym, group: null });
  }
  return { rows, source: "表格（同花顺等）" };
}

function parseImport(text) {
  const t = parseTable(text);
  if (t) return t;
  // TradingView / CSV / 每行一个：TradingView 用 ###分组名 开始一个分组
  const rows = []; let cur = null;
  for (let tok of text.replace(/\r/g, "").split(/[\n,;\t]+/)) {
    tok = tok.trim(); if (!tok) continue;
    if (tok.startsWith("###")) { cur = tok.slice(3).trim() || cur; continue; }
    if (/^(代码|symbol|code|ticker)$/i.test(tok)) continue;
    rows.push({ raw: tok, name: "", symbol: normSymbol(tok), group: cur });
  }
  return { rows, source: rows.some((r) => r.group) ? "TradingView 自选" : "代码列表" };
}

let impData = null;
$("#btnImport").onclick = () => { $("#importMsg").textContent = ""; showImpStep(1); $("#importDlg").showModal(); };
$("#importCancel").onclick = () => $("#importDlg").close();
$("#importFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  let text = await f.text();
  if (text.includes("�")) text = new TextDecoder("gbk").decode(await f.arrayBuffer()); // 同花顺等导出的 GBK 文件
  $("#importText").value = text;
};
function showImpStep(n) { $("#impStep1").style.display = n === 1 ? "" : "none"; $("#impStep2").style.display = n === 2 ? "" : "none"; }

$("#importNext").onclick = () => {
  const d = parseImport($("#importText").value);
  if (!d.rows.length) { $("#importMsg").textContent = "没有识别到任何代码，请检查粘贴的内容"; return; }
  // 去重（同一代码只保留第一行）
  const seen = new Set();
  d.rows.forEach((r) => { r.dup = r.symbol && seen.has(r.symbol); if (r.symbol) seen.add(r.symbol); r.on = !!r.symbol && !r.dup; });
  impData = d;
  const fileGroups = [...new Set(d.rows.map((r) => r.group).filter(Boolean))];
  const opts = [];
  if (fileGroups.length) opts.push(`<option value="__file">按文件中的分组（${fileGroups.join("、")}）</option>`);
  Object.keys(state.groups).forEach((g) => opts.push(`<option value="${g}">${g}</option>`));
  opts.push(`<option value="__new">新建分组…</option>`);
  $("#impTarget").innerHTML = opts.join("");
  $("#impTarget").value = fileGroups.length ? "__file" : (d.source.startsWith("表格") ? "__new" : state.group);
  $("#impNewGroup").value = d.source.startsWith("表格") ? "同花顺持仓" : "";
  $("#importReplace").checked = false;
  onImpTarget();
  showImpStep(2);
};
$("#impBack").onclick = () => showImpStep(1);
function impTargetGroup(r) {
  const v = $("#impTarget").value;
  if (v === "__file") return r.group || state.group;
  if (v === "__new") return $("#impNewGroup").value.trim() || "新分组";
  return v;
}
function onImpTarget() { $("#impNewGroup").style.display = $("#impTarget").value === "__new" ? "" : "none"; renderImpTable(); }
$("#impTarget").onchange = onImpTarget;
$("#impNewGroup").oninput = renderImpTable;
$("#importReplace").onchange = renderImpTable;

function renderImpTable() {
  if (!impData) return;
  const replace = $("#importReplace").checked;
  const rows = impData.rows;
  $("#impTable tbody").innerHTML = rows.map((r, i) => {
    const g = impTargetGroup(r);
    const exists = r.symbol && !replace && (state.groups[g] || []).includes(r.symbol);
    const st = !r.symbol ? '<span class="down">无法识别</span>' : r.dup ? '<span class="muted">重复</span>'
      : exists ? '<span class="muted">已在「' + g + '」</span>' : '<span class="up2">新增 → ' + g + "</span>";
    const dis = !r.symbol || r.dup || exists;
    return `<tr class="${dis ? "dis" : ""}"><td><input type="checkbox" data-i="${i}" ${r.on && !dis ? "checked" : ""} ${dis ? "disabled" : ""}></td>
      <td>${r.raw}</td><td>${r.name || (quotes[r.symbol] || {}).name || ""}</td><td>${r.symbol ? displayCode(r.symbol) : "—"}</td>
      <td>${r.symbol ? marketName(r.symbol) : ""}</td><td>${st}</td></tr>`;
  }).join("");
  updateImpSummary();
}
$("#impTable tbody").addEventListener("change", (e) => {
  const i = e.target.dataset.i; if (i === undefined) return;
  impData.rows[+i].on = e.target.checked; updateImpSummary();
});
$("#impAll").onchange = (e) => {
  document.querySelectorAll("#impTable tbody input:not(:disabled)").forEach((cb) => { cb.checked = e.target.checked; impData.rows[+cb.dataset.i].on = cb.checked; });
  updateImpSummary();
};
function impSelected() {
  return [...document.querySelectorAll("#impTable tbody input:checked")].map((cb) => impData.rows[+cb.dataset.i]);
}
function updateImpSummary() {
  const rows = impData.rows, sel = impSelected();
  const bad = rows.filter((r) => !r.symbol).length;
  $("#impSummary").innerHTML = `${impData.source}：识别 ${rows.length - bad} 个${bad ? `，<span class="down">${bad} 个无法识别</span>` : ""}，已选 <b>${sel.length}</b> 个`;
  $("#impConfirm").textContent = `确认导入 ${sel.length} 个`;
  $("#impConfirm").disabled = !sel.length;
}
$("#impConfirm").onclick = () => {
  const sel = impSelected(); if (!sel.length) return;
  const byGroup = {};
  sel.forEach((r) => { const g = impTargetGroup(r); (byGroup[g] = byGroup[g] || []).push(r.symbol); });
  const replace = $("#importReplace").checked;
  if (replace && !confirm(`将清空「${Object.keys(byGroup).join("、")}」原有内容后导入，确定吗？`)) return;
  let total = 0;
  for (const [g, syms] of Object.entries(byGroup)) {
    if (replace) state.groups[g] = [];
    total += addSymbols(syms, g);
  }
  const first = Object.keys(byGroup)[0];
  state.group = first; save();
  $("#importDlg").close();
  toast(`已导入 ${total} 个标的到「${Object.keys(byGroup).join("、")}」`);
  renderTabs(); renderWatch(); refresh();
};
$("#btnExport").onclick = () => {
  const tv = (s) => s.startsWith("sh") ? "SSE:" + s.slice(2) : s.startsWith("sz") ? "SZSE:" + s.slice(2)
    : s.startsWith("bj") ? "BSE:" + s.slice(2) : s.startsWith("hk") ? "HKEX:" + String(+s.slice(2) || s.slice(2)) : s.slice(3);
  const txt = Object.entries(state.groups).map(([g, l]) => ["###" + g, ...l.map(tv)].join(",")).join(",");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
  a.download = "watchlist.txt"; a.click();
};

/* ---------- 图表 ---------- */
const chart = (() => {
  try { return createMainChart($("#chart")); }
  catch (error) { console.warn("主图初始化失败", error); return null; }
})();
let chartData = null, renderingChart = false, volumePane = null;
let drawings = null;
if (chart && typeof createChartDrawings === "function" && $("#drawTools")) {
  try { drawings = createChartDrawings(chart, state.drawings ||= {}, save); }
  catch (error) { console.warn("划线工具初始化失败", error); }
}
function colors() {
  return state.redUp ? { up: "#ff3b3b", down: "#26d07c" } : { up: "#26d07c", down: "#ff3b3b" };
}
const MA_DEF = [[5, "#ffd400"], [10, "#ff5fd2"], [20, "#4fa3ff"], [60, "#3ee6e6"]];

function updateIopv() {
  const price = state.showIopv === false ? null : quotes[state.selected]?.iopv;
  setPriceReference(chart, "boardIopv", "IOPV", price, "#3ee6e6", [2, 3]);
  const hasRange = chart.getIndicatorByPaneId(PRICE_PANE, "BoardIopvRange");
  if (Number.isFinite(price) && price > 0 && isIntraday(state.period)) {
    const spec = { name: "BoardIopvRange", minValue: price, maxValue: price };
    if (hasRange) chart.overrideIndicator(spec, PRICE_PANE);
    else chart.createIndicator(spec, true, { id: PRICE_PANE });
  } else if (hasRange) chart.removeIndicator(PRICE_PANE, "BoardIopvRange");
}

/* K 线数据缓存：同一标的+周期再次切回时立即显示，后台再静默刷新 */
const klineCache = new Map();          // key -> { d, at }
const inflight = new Map();            // key -> Promise
const kkey = (s, p) => s + "|" + p;
const isIntraday = (p) => p === "min" || p.startsWith("m");
const maxAge = (p) => (isIntraday(p) ? 10000 : 60000);

function fetchKline(s, p) {
  const k = kkey(s, p);
  if (inflight.has(k)) return inflight.get(k);
  const pr = fetch(`/api/kline?s=${encodeURIComponent(s)}&p=${p}`).then((r) => r.json()).then((d) => {
    if (d && d.bars && d.bars.length && !d.error) klineCache.set(k, { d, at: Date.now() });
    return d;
  }).finally(() => inflight.delete(k));
  inflight.set(k, pr);
  return pr;
}

let shownKey = null;   // 图上当前显示的是哪个 标的|周期
let chartReq = 0;

/* 画图：fit=true 时按新数据重新定位视野；fit=false 时保留当前视野（只用于同一标的同一周期的刷新） */
function renderChart(d, fit, key = shownKey) {
  if (!chart || key !== kkey(state.selected, state.period)) return;
  const previous = chart.getDataList();
  const spacing = chart.getBarSpace();
  const previousLast = previous.at(-1);
  const x = previousLast && chart.convertToPixel({ dataIndex: previous.length - 1 }, { paneId: PRICE_PANE }).x;
  const offset = x == null ? 4 : (chart.getSize(PRICE_PANE, "main").width - x) / spacing - 0.5;
  const followLatest = offset >= 0;
  const quote = quotes[state.selected] || {};
  const intraday = d.type === "line";
  const c = colors();
  const bars = d.bars.map((b, i) => chartBar(b, d.bars[i - 1]));
  const area = intraday && (state.ctype === "line" || d.bars[0].open === undefined);
  const type = area ? "area" : PRICE_TYPES[state.ctype] || "candle_solid";
  renderingChart = true;
  try {
    window.dispatchEvent(new Event("board:chart-clear"));
    ovSeries.forEach(({ name }) => chart.removeIndicator(PRICE_PANE, name));
    ovSeries = [];
    chartData = d;
    chart.setPriceVolumePrecision(quote.fundType || /^(sh5|sz1)/.test(state.selected) ? 3 : 2, 0);
    chart.setStyles({
      candle: {
        type,
        area: {
          lineColor: "#ffb000", lineSize: 2, point: { show: false },
          backgroundColor: area ? [{ offset: 0, color: "rgba(255,176,0,.22)" }, { offset: 1, color: "rgba(255,176,0,0)" }] : "transparent",
        },
        bar: {
          upColor: c.up, upBorderColor: c.up, upWickColor: c.up,
          downColor: c.down, downBorderColor: c.down, downWickColor: c.down,
          noChangeColor: c.up, noChangeBorderColor: c.up, noChangeWickColor: c.up,
        },
        priceMark: { last: { upColor: c.up, downColor: c.down, noChangeColor: c.up } },
      },
      yAxis: { type: state.logScale ? "log" : "normal" },
    });
    chart.applyNewData(bars, false);
    const hasMa = chart.getIndicatorByPaneId(PRICE_PANE, "MA");
    if (!intraday && state.showMA !== false && !hasMa) {
      chart.createIndicator({
        name: "MA", calcParams: MA_DEF.map(([n]) => n),
        styles: { lines: MA_DEF.map(([, color]) => indicatorLineStyle(color)) },
      }, true, { id: PRICE_PANE });
    } else if ((intraday || state.showMA === false) && hasMa) chart.removeIndicator(PRICE_PANE, "MA");
    if (intraday && d.bars.some(b => b.avg)) {
      setChartLine(chart, "BoardAverage", d.bars.map(b => ({ time: b.time, value: b.avg || undefined })), "#ffd400");
    } else chart.removeIndicator(PRICE_PANE, "BoardAverage");
    const volumeColors = { up: c.up + "99", down: c.down + "99" };
    if (state.showVol === false && volumePane) {
      chart.removeIndicator(volumePane, "BoardVolume");
      volumePane = null;
    } else if (!volumePane && state.showVol !== false) {
      volumePane = chart.createIndicator({ name: "BoardVolume", extendData: volumeColors }, false,
        { height: Math.max(55, Math.round($("#chart").clientHeight * 0.18)), minHeight: 40 });
    } else if (volumePane) chart.overrideIndicator({ name: "BoardVolume", extendData: volumeColors }, volumePane);
    updateIopv();
    setPriceReference(chart, "boardPrevClose", "昨收", intraday ? d.prevClose || quote.prevClose : null, "#8a7a5a", [5, 4]);

    if (fit) {
      const day = (t) => new Date(t).toISOString().slice(0, 10);
      let count = Math.min(bars.length, 160);
      if (intraday) {
        const latestDay = day(bars.at(-1).timestamp);
        count = 1;
        while (count < bars.length && day(bars[bars.length - 1 - count].timestamp) === latestDay) count++;
      }
      const width = chart.getSize(PRICE_PANE, "main").width;
      chart.setBarSpace(Math.max(1, Math.min(50, width / (count + 4))));
      chart.setOffsetRightDistance(4 * chart.getBarSpace());
    } else {
      const previousIndex = bars.findIndex(b => b.timestamp === previousLast?.timestamp);
      const nextOffset = !followLatest && previousIndex >= 0 ? offset + previousIndex - bars.length + 1 : offset;
      chart.setOffsetRightDistance(Math.max(0, nextOffset * spacing));
      if (nextOffset < 0) chart.scrollByDistance(-nextOffset * spacing);
    }
    drawings?.bind(key);
  } finally { renderingChart = false; }
  window.dispatchEvent(new CustomEvent("board:chart-ready", { detail: key }));
  drawOverlays();
  showLegend(null);
}

async function loadChart(fit = true) {
  if (MINI) return;
  if (!chart) { $("#legend").textContent = "主图加载失败"; return; }
  const s = state.selected, p = state.period; if (!s) return;
  const k = kkey(s, p);
  drawings?.setKey(k);
  if (k !== shownKey) fit = true;           // 换了标的或周期，一定重新定位视野
  const my = ++chartReq;
  const hit = klineCache.get(k);
  if (hit && fit) { renderChart(hit.d, true, k); shownKey = k; }
  if (hit && Date.now() - hit.at < maxAge(p)) { prefetch(s); return; }
  if (!hit && fit) $("#legend").textContent = "加载中…";
  let d;
  try { d = await fetchKline(s, p); }
  catch (e) { if (my === chartReq && !hit) $("#legend").textContent = "K线加载失败：" + e; return; }
  if (my !== chartReq || state.selected !== s || state.period !== p) return;   // 用户已经切走
  if (d.error || !d.bars || !d.bars.length) { if (!hit) $("#legend").textContent = "K线加载失败：" + (d.error || "无数据"); return; }
  // 刷新时保留之前往左加载的更早历史
  if (shownKey === k && chartData && chartData.bars.length) {
    const first = d.bars[0].time;
    const older = chartData.bars.filter((b) => b.time < first);
    if (older.length) { d = Object.assign({}, d, { bars: older.concat(d.bars) }); klineCache.set(k, { d, at: Date.now() }); }
  }
  renderChart(d, !hit && fit, k);
  shownKey = k;
  prefetch(s);
}

/* 往左拖到最早的 K 线附近时，自动加载更早的历史（东方财富，日期之前 1000 根） */
let loadingOlder = false;
const exhausted = new Set();
chart?.subscribeAction("onVisibleRangeChange", (r) => {
  if (renderingChart || !r || r.from > 15 || loadingOlder || !chartData || !shownKey) return;
  if (shownKey !== kkey(state.selected, state.period)) return;
  if (exhausted.has(shownKey)) return;
  loadOlder();
});
async function loadOlder() {
  const k = shownKey, s = state.selected, p = state.period, d0 = chartData;
  const first = d0.bars[0].time;
  loadingOlder = true;
  $("#legend").textContent = "加载更早数据…";
  try {
    const d = await (await fetch(`/api/kline?s=${encodeURIComponent(s)}&p=${p}&before=${first}`)).json();
    if (shownKey !== k || k !== kkey(state.selected, state.period) || chartData !== d0) return;
    const older = (d.bars || []).filter((b) => b.time < first);
    if (!older.length) { exhausted.add(k); showLegend(null); return; }
    const merged = Object.assign({}, d0, { bars: older.concat(d0.bars) });
    klineCache.set(k, { d: merged, at: (klineCache.get(k) || {}).at || Date.now() });
    renderChart(merged, false);
  } catch { exhausted.add(k); showLegend(null); }
  finally { loadingOlder = false; }
}

/* 预取常用周期，切换时几乎瞬间出图 */
let prefetchTimer;
function prefetch(s) {
  clearTimeout(prefetchTimer);
  prefetchTimer = setTimeout(() => {
    ["min", "m5", "day", "m15", "m1", "m30", "m60", "week"].forEach((p, i) => {
      const hit = klineCache.get(kkey(s, p));
      if (!hit || Date.now() - hit.at > maxAge(p)) setTimeout(() => { if (state.selected === s) fetchKline(s, p).catch(() => {}); }, i * 300);
    });
  }, 800);
}

/* 图例：十字光标所在 K 线的开高低收，不在图上时显示最后一根 */
const PNAME = { min: "分时", m1: "1分", m5: "5分", m15: "15分", m30: "30分", m60: "60分", day: "日K", week: "周K", month: "月K" };
function showLegend(param) {
  if (!chartData) return;
  const d = chartData;
  const full = d.bars[param?.dataIndex] || d.bars.at(-1);
  const tag = `<b style="color:#ff8c00">${PNAME[state.period]}</b> <span class="muted">· ${d.source || ""}</span>`;
  const tstr = typeof full.time === "number" ? new Date(full.time * 1000).toISOString().slice(5, 16).replace("T", " ") : full.time;
  if (d.type === "line") {
    $("#legend").innerHTML = `${tag}  ${tstr}  价 <b style="color:#e8e8e8">${fmt(full.value)}</b>` +
      (full.avg ? `  均 <b style="color:#ffd400">${fmt(full.avg)}</b>` : "") + `  量 ${fmt(full.volume, 0)}`;
    return;
  }
  const k = full.close >= full.open ? "up" : "down";
  $("#legend").innerHTML = `${tag}  ${tstr}  开 <b class="${k}">${fmt(full.open)}</b> 高 <b class="${k}">${fmt(full.high)}</b> 低 <b class="${k}">${fmt(full.low)}</b> 收 <b class="${k}">${fmt(full.close)}</b>  量 ${fmt(full.volume, 0)}  ` +
    (state.showMA === false ? [] : MA_DEF).map(([n, color]) => `<b style="color:${color}">MA${n}</b>`).join(" ");
}
chart?.subscribeAction("onCrosshairChange", (p) => { showLegend(p); ovLegend(p); });
$("#chart").addEventListener("mouseleave", () => { showLegend(null); ovLegend(null); });

/* ---------- 曲线叠加：其他标的按涨跌幅对齐画在主图上（类似 TradingView 的“对比”） ----------
   以当前视野最左边那根 K 线为基准点，叠加标的换算成“同样涨跌幅下主图的价格”，
   这样主图坐标、均线都不受影响；拖动 / 缩放时重新按新的左边界对齐。 */
const OV_COLORS = ["#7c9cff", "#ff79c6", "#e0e0e0", "#c792ea", "#3ee6e6"];
const ovData = new Map();        // 标的|周期 -> bars
const ovExhausted = new Set();
let ovSeries = [];               // [{ sym, name, color }]
let ovAnchorIdx = null;
// 叠加按主图标的分别保存：每个标的有自己的一套叠加，切到别的标的不会带过去
state.ovMap = state.ovMap || {};
if (state["overlays"]) { if (state["overlays"].length && state.selected) state.ovMap[state.selected] = state["overlays"]; delete state["overlays"]; }
function setOvList(list) {
  if (list.length) state.ovMap[state.selected] = list; else delete state.ovMap[state.selected];
  save();
}
const ovVal = (b) => (b.close !== undefined ? b.close : b.value);
const PERIOD_SEC = { min: 60, m1: 60, m5: 300, m15: 900, m30: 1800, m60: 3600 };

function ovAligned(bars) {
  // 对每根主图 K 线，取叠加标的在该时间点（或之前最近）的收盘价；分时/分钟线超过 2 根 K 线的空档留空
  const main = chartData.bars, out = new Array(main.length).fill(null);
  const tol = isIntraday(state.period) ? PERIOD_SEC[state.period] * 2 : Infinity;
  let j = 0;
  for (let i = 0; i < main.length; i++) {
    const t = main[i].time;
    while (j + 1 < bars.length && bars[j + 1].time <= t) j++;
    if (!bars.length || bars[j].time > t) continue;
    if (typeof t === "number" && t - bars[j].time > tol) continue;
    out[i] = ovVal(bars[j]);
  }
  return out;
}

function ovAnchor() {
  const r = chart.getVisibleRange();
  const n = chartData.bars.length;
  return Math.min(n - 1, Math.max(0, r ? Math.ceil(r.from) : 0));
}

function ovPaint(force) {
  if (!chartData || !ovSeries.length) return;
  const a = ovAnchor();
  if (!force && a === ovAnchorIdx) return;
  ovAnchorIdx = a;
  const main = chartData.bars;
  for (const o of ovSeries) {
    const bars = ovData.get(kkey(o.sym, state.period));
    if (!bars) continue;
    const al = ovAligned(bars); o.al = al;
    // 基准：视野左边界起第一个两边都有数据的点
    let k = a; while (k < main.length && al[k] == null) k++;
    if (k >= main.length) { k = a; while (k >= 0 && al[k] == null) k--; }
    if (k < 0) { chart.removeIndicator(PRICE_PANE, o.name); o.base = null; continue; }
    const m0 = ovVal(main[k]), b0 = al[k];
    o.base = b0; o.mainBase = m0;
    setChartLine(chart, o.name, main.map((b, i) => ({ time: b.time, value: al[i] == null ? undefined : (al[i] / b0) * m0 })), o.color, 2);
  }
}
let ovRaf = 0;
chart?.subscribeAction("onVisibleRangeChange", () => {
  if (renderingChart || !ovSeries.length || ovRaf) return;
  ovRaf = requestAnimationFrame(() => { ovRaf = 0; ovPaint(false); ovLegend(null); });
});

async function ovFetch(sym, p, onFirst) {
  const k = kkey(sym, p);
  if (!ovData.has(k)) {
    const d = await fetchKline(sym, p).catch(() => null);
    if (!d || d.error || !d.bars || !d.bars.length) throw new Error((d && d.error) || "无数据");
    ovData.set(k, d.bars);
    onFirst();   // 先画出来，再补更早的历史
  }
  // 主图往左加载了更早的历史时，叠加标的也补齐
  const need = chartData && chartData.bars[0].time;
  for (let tries = 0; tries < 3; tries++) {
    const bars = ovData.get(k);
    if (!need || bars[0].time <= need || ovExhausted.has(k)) break;
    const d = await (await fetch(`/api/kline?s=${encodeURIComponent(sym)}&p=${p}&before=${bars[0].time}`)).json().catch(() => ({}));
    const older = (d.bars || []).filter((b) => b.time < bars[0].time);
    if (!older.length) { ovExhausted.add(k); break; }
    ovData.set(k, older.concat(bars));
  }
}

function drawOverlays() {
  renderOvChips();
  if (!chartData || !ovList().length) { ovLegend(null); return; }
  const p = state.period, sel = state.selected;
  ovSeries = ovList().filter((sym) => sym !== state.selected).map((sym) => {
    const color = OV_COLORS[ovList().indexOf(sym) % OV_COLORS.length];
    return { sym, name: "BoardCompare" + ovList().indexOf(sym), color };
  });
  ovAnchorIdx = null;
  ovPaint(true);
  const mine = ovSeries;
  const repaint = () => {
    if (ovSeries !== mine || state.period !== p || state.selected !== sel) return;
    ovPaint(true); ovLegend(null);
  };
  mine.forEach((o) => ovFetch(o.sym, p, repaint).catch((e) => { o.err = e.message; }).then(repaint));
}

function ovPct(o, i) {
  if (!o.al || o.base == null || i == null || o.al[i] == null) return null;
  return (o.al[i] / o.base - 1) * 100;
}
function ovLegend(param) {
  let el = $("#ovLegend");
  if (!ovSeries.length || !chartData) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "ovLegend"; $("#chart").appendChild(el); }
  const main = chartData.bars;
  const i = param?.dataIndex ?? main.length - 1;
  const a = ovAnchorIdx ?? 0;
  const mp = (ovVal(main[i]) / ovVal(main[Math.min(a, main.length - 1)]) - 1) * 100;
  const row = (color, name, pct) => `<div><i style="background:${color}"></i>${name} <b class="${cls(pct)}">${pct == null ? "—" : pctStr(pct)}</b></div>`;
  el.innerHTML = row("#ffb000", (quotes[state.selected] || {}).name || displayCode(state.selected), mp) +
    ovSeries.map((o) => row(o.color, ((quotes[o.sym] || {}).name || displayCode(o.sym)) + (o.err ? ` <span class="down">${o.err}</span>`
      : o.al && o.base == null ? ' <span class="muted">（与主图没有重叠的交易时段）</span>' : ""), ovPct(o, i))).join("") +
    `<div class="muted">相对视野左端</div>`;
}

function renderOvChips() {
  $("#ovlChips").innerHTML = ovList().map((sym, i) =>
    `<span class="chip" data-s="${sym}" title="点击切换到该标的"><i style="background:${OV_COLORS[i % OV_COLORS.length]}"></i>${(quotes[sym] || {}).name || displayCode(sym)}<b data-x="${sym}" title="移除叠加">✕</b></span>`).join("");
}
function addOverlay(sym) {
  sym = normSymbol(sym) || sym;
  if (!sym || ovList().includes(sym) || sym === state.selected) return;
  if (ovList().length >= 5) return toast("最多叠加 5 个");
  setOvList([...ovList(), sym]);
  if (!quotes[sym]) fetch("/api/quotes?s=" + encodeURIComponent(sym)).then((r) => r.json()).then((d) => { Object.assign(quotes, d); renderOvChips(); ovLegend(null); }).catch(() => {});
  if (chartData) renderChart(chartData, false);
}
function removeOverlay(sym) {
  setOvList(sym ? ovList().filter((x) => x !== sym) : []);
  if (chartData) renderChart(chartData, false);
}
$("#ovlChips").addEventListener("click", (e) => {
  if (e.target.dataset.x) return removeOverlay(e.target.dataset.x);
  const c = e.target.closest(".chip"); if (c) select(c.dataset.s);
});

/* 添加叠加的小弹窗：常用指数 + 当前分组，输入可搜索 */
const OV_QUICK = ["sh000001", "sh000300", "sz399006", "sh000688", "hkHSI", "yf:^GSPC", "yf:^IXIC", "yf:^DJI", "yf:GC=F", "yf:CL=F", "yf:USDCNH=X"];
let ovSearchTimer;
function ovRenderList(items) {
  $("#ovlList").innerHTML = items.map(([s, n]) => `<div data-s="${s}">${n || displayCode(s)} <span class="muted">${displayCode(s)}</span></div>`).join("")
    || '<div class="muted">没有匹配，回车按代码添加</div>';
}
function ovDefaultList(q = "") {
  const syms = [...new Set([...OV_QUICK, ...(state.groups[state.group] || [])])].filter((s) => s !== state.selected && !ovList().includes(s));
  const items = syms.map((s) => [s, (quotes[s] || {}).name]);
  const f = q.toLowerCase();
  return f ? items.filter(([s, n]) => s.toLowerCase().includes(f) || (n || "").toLowerCase().includes(f)) : items;
}
$("#btnOverlay").onclick = (e) => {
  e.stopPropagation();
  const pop = $("#ovlPop"), on = pop.style.display !== "block";
  pop.style.display = on ? "block" : "none";
  if (on) { $("#ovlInput").value = ""; ovRenderList(ovDefaultList()); $("#ovlInput").focus(); }
};
$("#ovlInput").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  ovRenderList(ovDefaultList(q));
  clearTimeout(ovSearchTimer);
  if (!q) return;
  ovSearchTimer = setTimeout(async () => {
    try {
      const r = await (await fetch("/api/search?q=" + encodeURIComponent(q))).json();
      if (Array.isArray(r) && r.length && $("#ovlInput").value.trim() === q)
        ovRenderList([...ovDefaultList(q), ...r.map((x) => [x.symbol, x.name])].slice(0, 30));
    } catch (_) { /* 搜索不可用时仍可回车按代码添加 */ }
  }, 250);
});
$("#ovlInput").addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("#ovlPop").style.display = "none";
  if (e.key !== "Enter") return;
  const first = $("#ovlList [data-s]");
  const v = e.target.value.trim();
  const sym = normSymbol(v) || (first && first.dataset.s);
  if (sym) { addOverlay(sym); $("#ovlPop").style.display = "none"; }
});
$("#ovlList").addEventListener("click", (e) => {
  const d = e.target.closest("[data-s]"); if (!d) return;
  addOverlay(d.dataset.s); $("#ovlPop").style.display = "none";
});
document.addEventListener("click", (e) => { if (!e.target.closest("#ovl")) $("#ovlPop").style.display = "none"; });

/* 日/周/月 K 线的最后一根随实时报价更新，不必整张图重载 */
function patchLastBar() {
  if (shownKey !== kkey(state.selected, state.period)) return;
  if (!chart) return;
  updateIopv();
  if (!chartData || chartData.type !== "candle" || !["day", "week", "month"].includes(state.period)) return;
  const price = quotes[state.selected]?.price;
  if (!Number.isFinite(price)) return;
  const bars = chartData.bars;
  const last = bars.at(-1);
  if (last.close === price) return;
  last.close = price;
  last.high = Math.max(last.high, price);
  last.low = Math.min(last.low, price);
  chart.updateData(chartBar(last, bars.at(-2)));
}

function setSeg(sel, attr, val) {
  document.querySelectorAll(sel + " button").forEach((x) => x.classList.toggle("on", x.dataset[attr] === val));
}
document.querySelectorAll("#periods button").forEach((b) => {
  b.onclick = () => { state.period = b.dataset.p; save(); setSeg("#periods", "p", state.period); loadChart(true); };
});
// 切换图形不重新拉数据，直接用当前数据重画，保留视野
document.querySelectorAll("#ctypes button").forEach((b) => {
  b.onclick = () => {
    state.ctype = b.dataset.t; save(); setSeg("#ctypes", "t", state.ctype);
    if (chartData && shownKey === kkey(state.selected, state.period)) renderChart(chartData, false);
    else loadChart(true);
  };
});
// 分时与分钟 K 每 10 秒刷新，日/周/月 每 60 秒刷新（中间由 patchLastBar 实时更新最后一根）
setInterval(() => {
  if (document.hidden || !shownKey) return;
  const hit = klineCache.get(shownKey);
  if (!hit || Date.now() - hit.at >= maxAge(state.period)) loadChart(false);
}, 2000);

/* ---------- 世界时钟 ---------- */
const CLOCKS = [["北京", "Asia/Shanghai"], ["东京", "Asia/Tokyo"], ["伦敦", "Europe/London"], ["纽约", "America/New_York"]];
function renderClocks() {
  const now = new Date();
  $("#clocks").innerHTML = CLOCKS.map(([n, tz]) =>
    `<span>${n} <b>${now.toLocaleTimeString("zh-CN", { timeZone: tz, hour12: false })}</b></span>`).join("");
}
setInterval(renderClocks, 1000); renderClocks();

/* ---------- 选中 / 详情 ---------- */
function select(s) {
  state.selected = s; save();
  renderWatch(); renderDetail(); renderOvChips(); loadChart(true);
  if (!quotes[s]) refresh();
  // 供资讯面板 / Agent 等模块订阅：当前选中的标的变化
  const q = quotes[s] || {};
  window.dispatchEvent(new CustomEvent("board:select", { detail: { symbol: s, name: q.name || displayCode(s), code: displayCode(s) } }));
}
window.board = {
  get selected() { return state.selected; },
  quote: (s) => quotes[s || state.selected],
  select,
  displayCode,
};
const QUOTE_PERIODS = [["1D", "近 1 个交易日"], ["1W", "近 1 周"], ["1M", "近 1 个月"],
  ["3M", "近 3 个月"], ["6M", "近 6 个月"], ["YTD", "年初至今"], ["1Y", "近 1 年"]];
const QUOTE_EXCHANGES = { sh: "上交所", sz: "深交所", bj: "北交所", hk: "港交所" };
const QUOTE_DAY = 86400000;
const QUOTE_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const quoteText = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => QUOTE_ESCAPE[char]);
let quoteHistoryShown, quoteHistoryRequested;

function quoteMonthAgo(date, months) {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() - months;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return Date.UTC(y, m, day);
}

function quoteDailyBars(data) {
  const bars = Array.isArray(data?.bars) ? data.bars : [];
  return bars.flatMap((bar) => {
    if (!Number.isFinite(bar?.close)) return [];
    const time = typeof bar.time === "string" ? bar.time.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(time) && Number.isFinite(Date.parse(time))) return [{ ...bar, time }];
    if (!Number.isFinite(bar.time)) return [];
    const date = new Date(bar.time * 1000);
    return Number.isFinite(date.getTime()) ? [{ ...bar, time: date.toISOString().slice(0, 10) }] : [];
  });
}

function quoteHistoryStats(data) {
  const daily = quoteDailyBars(data);
  const last = daily.at(-1);
  if (!last) return { returns: [] };
  const day = new Date(last.time + "T00:00:00Z");
  const cutoff = (ms) => new Date(ms).toISOString().slice(0, 10);
  const dates = [day.getTime() - 7 * QUOTE_DAY, ...[1, 3, 6].map((m) => quoteMonthAgo(day, m)),
    Date.UTC(day.getUTCFullYear() - 1, 11, 31), quoteMonthAgo(day, 12)];
  const newestFirst = daily.slice().reverse();
  const bases = [daily.at(-2), ...dates.map(cutoff).map((date) => newestFirst.find((bar) => bar.time <= date))];
  const returns = bases.map((base) => base?.close > 0 ? (last.close / base.close - 1) * 100 : null);
  const from = cutoff(day.getTime() - 364 * QUOTE_DAY);
  let range;
  if (daily[0].time <= from) {
    const recent = daily.filter((bar) => bar.time >= from && Number.isFinite(bar.high) && Number.isFinite(bar.low));
    if (recent.length) {
      const low = Math.min(...recent.map((bar) => bar.low)), high = Math.max(...recent.map((bar) => bar.high));
      const position = high > low ? Math.min(100, Math.max(0, (last.close - low) / (high - low) * 100)) : null;
      range = { low, high, position };
    }
  }
  return { returns, range, date: last.time };
}

function needsHistoricalQuote(symbol, quote) {
  return (symbol.startsWith("yf:") || symbol.startsWith("hk")) && !Number.isFinite(quote?.price);
}

function historicalQuote(data) {
  const bars = quoteDailyBars(data);
  const last = bars.at(-1);
  if (!last) return null;
  const prevClose = bars.at(-2)?.close;
  const change = prevClose == null ? null : last.close - prevClose;
  return { price: last.close, open: last.open, high: last.high, low: last.low, volume: last.volume,
    time: last.time, source: data.source, prevClose, change, pct: prevClose > 0 ? change / prevClose * 100 : null };
}

function updateQuoteHistory(s) {
  if (MINI) return;
  const now = Date.now(), hit = klineCache.get(kkey(s, "day"));
  if (quoteHistoryShown?.symbol !== s || quoteHistoryShown.data !== hit?.d) {
    quoteHistoryShown = { symbol: s, data: hit?.d };
    const { returns, range, date } = quoteHistoryStats(hit?.d);
    const position = range?.position;
    const name = hit?.d.source ? `${hit.d.source}日K` : "日K";
    const tiles = QUOTE_PERIODS.map(([label, title], i) => {
      const pct = returns[i];
      const tint = pct == null || pct === 0 ? 0 : Math.min(34, 8 + Math.abs(pct) * 1.25);
      const rounded = pct == null ? "—" : `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toFixed(1)}%`;
      return `<div class="${cls(pct)}" style="--tint:${tint}%" title="${title} ${pctStr(pct)}"><dt>${label}</dt><dd>${rounded}</dd></div>`;
    }).join("");
    $("#detailHistory").innerHTML = `<div class="quote-range" title="按日K最高价、最低价和最新收盘价计算">
      <div class="quote-range-label"><span>52 周区间</span><strong>${position == null ? "" : position.toFixed(0) + "%"}</strong></div>
      <div class="quote-range-values"><span>${fmt(range?.low)}</span>
        <div class="quote-range-track" aria-hidden="true"${position == null ? "" : ` style="--position:${position}%"`}>${position == null ? "" : "<i></i><b></b>"}</div>
        <span>${fmt(range?.high)}</span></div></div>
      <dl class="quote-performance" aria-label="各周期涨跌幅">${tiles}</dl>
      ${date ? `<small class="quote-history-date" title="涨跌幅按日K收盘价计算">${quoteText(name)}截至 ${date}</small>` : ""}`;
  }
  if ((hit && now - hit.at < maxAge("day")) ||
      (quoteHistoryRequested?.symbol === s && now - quoteHistoryRequested.at < 15000)) return;
  quoteHistoryRequested = { symbol: s, at: now };
  fetchKline(s, "day").then(() => {
    if (state.selected !== s || MINI) return;
    if (needsHistoricalQuote(s, quotes[s])) renderDetail();
    else updateQuoteHistory(s);
  }).catch(() => {});
}

function renderDetail() {
  const s = state.selected; const live = quotes[s] || {};
  window.dispatchEvent(new CustomEvent("board:quote", { detail: { symbol: s, quote: live } }));
  $("#cName").textContent = live.name || displayCode(s);
  $("#cAdd").classList.toggle("show", !!s && !(state.groups[state.group] || []).includes(s));
  $("#cCode").textContent = displayCode(s);
  $("#cPrice").textContent = fmt(live.price); $("#cPrice").className = "big";
  $("#cPct").textContent = live.change != null ? `${live.change > 0 ? "+" : ""}${fmt(live.change)}  ${pctStr(live.pct)}` : "";
  $("#cPct").className = "";
  const daily = needsHistoricalQuote(s, live) ? historicalQuote(klineCache.get(kkey(s, "day"))?.d) : null;
  const q = daily ? { ...live, ...daily, ext: null } : live;
  const currency = q.currency || (s.startsWith("hk") ? "HKD" : s.startsWith("yf:") ? "" : "CNY");
  const exchange = q.exchange || QUOTE_EXCHANGES[s.slice(0, 2)];
  const meta = [displayCode(s), exchange, currency, daily && "日K报价"].filter(Boolean).join(" · ");
  const rows = [["今开", fmt(q.open)], ["最高", fmt(q.high)], ["最低", fmt(q.low)], ["昨收", fmt(q.prevClose)],
    ["成交量", fmt(q.volume, 0)]];
  if (q.fundType) {
    if (q.iopv) rows.push(["IOPV", fmt(q.iopv, 4), "", "实时参考净值（交易所每 15 秒左右发布）"]);
    if (q.premium != null) rows.push([q.iopv ? "溢价率" : "溢价率(对昨净值)", pctStr(q.premium), cls(q.premium)]);
    if (q.nav) rows.push(["单位净值(昨)", fmt(q.nav, 4)]);
  }
  if (q.ext) rows.push([q.ext.label + "价", `${fmt(q.ext.price)} ${pctStr(q.ext.pct)}`, cls(q.ext.pct)],
    [q.ext.label + "时间", displayDate(q.ext.time)]);
  if (s.startsWith("yf:") && (q.ext || /^(NASDAQ|NYSE|AMEX|NYSEARCA|CBOE|BATS)/i.test(q.exchange || "")))
    rows.push(["美股时段", SESSION_NAME[usSession()]]);
  const fields = rows.map(([label, value, tone = "", title = ""]) =>
    `<div><dt>${quoteText(label)}</dt><dd class="${tone}"${title ? ` title="${quoteText(title)}"` : ""}>${quoteText(value)}</dd></div>`).join("");
  const change = q.change == null ? "" : `${q.change > 0 ? "+" : ""}${fmt(q.change)}`;
  const quote = $("#detailQuote");
  quote.innerHTML = `<h2 class="quote-name">${quoteText(q.name || displayCode(s))}</h2>
    <div class="quote-headline"><strong class="quote-price">${fmt(q.price)}</strong>
      ${change || q.pct != null ? `<span class="quote-change ${cls(q.pct ?? q.change)}"><span>${change}</span><span>${pctStr(q.pct)}</span></span>` : ""}</div>
    <div class="quote-meta"><span>${quoteText(meta)}</span>${q.time ? `<time title="${daily ? "日K日期" : "行情时间"}">${quoteText(q.time)}</time>` : ""}</div>
    <dl class="quote-grid">${fields}</dl>
    ${q.error && !daily ? `<p class="quote-error down">${quoteText(q.error)}</p>` : ""}`;
  quote.title = daily ? (q.source ? `日K来源：${q.source}` : "") : (q.source ? `行情来源：${q.source}` : "");
  updateQuoteHistory(s);
}

/* ---------- 设置 ---------- */
$("#interval").value = String(state.interval);
$("#interval").onchange = (e) => { state.interval = +e.target.value; save(); startTimer(); };
$("#redUp").checked = state.redUp;
document.body.classList.toggle("greenUp", !state.redUp);
$("#redUp").onchange = (e) => {
  state.redUp = e.target.checked; save();
  document.body.classList.toggle("greenUp", !state.redUp); renderWatch(); if (chartData) renderChart(chartData, false);
};

/* ---------- 智能缩放：字号随窗口宽度和屏幕缩放自动调整，Ctrl+滚轮 / Ctrl +/−/0 手动微调 ---------- */
let zoomFrame = 0;
let appliedFontSize = 0;
function applyZoom(showTip) {
  const auto = Math.max(10.5, Math.min(16, 12.5 * Math.min(innerWidth / 1600, innerHeight / 860)));
  const px = Math.round(auto * (state.zoom || 1) * 100) / 100;
  if (px !== appliedFontSize) {
    appliedFontSize = px;
    document.documentElement.style.fontSize = `${px}px`;
    chart?.setStyles({ xAxis: { tickText: { size: Math.round(px * 0.88) } }, yAxis: { tickText: { size: Math.round(px * 0.88) } } });
  }
  if (showTip) {
    let t = $("#zoomtip"); if (!t) { t = document.createElement("div"); t.id = "zoomtip"; document.body.appendChild(t); }
    t.textContent = `缩放 ${Math.round((state.zoom || 1) * 100)}%`; t.classList.add("on");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 1200);
  }
}
function setZoom(z) { state.zoom = Math.max(0.6, Math.min(2, Math.round(z * 100) / 100)); save(); applyZoom(true); }
addEventListener("resize", () => {
  if (zoomFrame) return;
  zoomFrame = requestAnimationFrame(() => { zoomFrame = 0; applyZoom(false); });
});
addEventListener("wheel", (e) => {
  if (!e.ctrlKey || !e.deltaY) return;
  e.preventDefault();
  e.stopPropagation();
  setZoom((state.zoom || 1) * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { capture: true, passive: false });
addEventListener("keydown", (e) => {
  if (!e.ctrlKey) return;
  if (e.key === "=" || e.key === "+") { e.preventDefault(); setZoom((state.zoom || 1) * 1.1); }
  else if (e.key === "-") { e.preventDefault(); setZoom((state.zoom || 1) / 1.1); }
  else if (e.key === "0") { e.preventDefault(); setZoom(1); }
});
applyZoom(false);

/* ---------- 版本戳 + 程序内更新 ---------- */
let curVersion = null, updInfo = null, installedChannel = "main", updateRequest = 0;
const updateChannel = () => state.updateChannel || installedChannel;
const updateDialog = $("#updateDialog");
function openUpdates() {
  $("#useNext").checked = updateChannel() === "next";
  if (!updateDialog.open) updateDialog.showModal();
  checkUpdate(true);
}
$("#useNext").onchange = (event) => {
  state.updateChannel = event.target.checked ? "next" : "main";
  save();
  checkUpdate(true);
};
$("#installChecked").onclick = () => doUpdate();
$("#ver").onclick = openUpdates;
fetch("/api/version").then((r) => r.json()).then((v) => {
  curVersion = v.version;
  installedChannel = v.channel || "main";
  $("#ver").textContent = `v${v.version} · ${installedChannel} · ${v.build}`;
  $("#ver").title = `服务端版本 ${v.version}，构建于 ${v.build}（进程 ${v.pid}）`;
  setTimeout(() => checkUpdate(false), 3000);
}).catch(() => { $("#ver").textContent = "版本未知（旧服务端）"; $("#ver").classList.add("down"); });

async function checkUpdate(manual) {
  const request = ++updateRequest;
  const channel = updateChannel();
  if (manual) {
    updInfo = null;
    $("#installChecked").disabled = true;
    $("#updBtn").style.display = "none";
    $("#updateResult").textContent = "正在检查 " + channel + "…";
  }
  try {
    const r = await (await fetch("/api/update/check?channel=" + channel + "&force=" + (manual ? 1 : 0))).json();
    if (request !== updateRequest) return;
    if (r.error) throw new Error(r.error);
    $("#ver").classList.remove("updfail");
    const srcs = (r.sources || []).map((x) => `${x.src}：${x.version ? "v" + x.version : "失败 " + (x.error || "")}`).join("\n");
    $("#ver").title = `最新版本 v${r.latest}（${new Date().toLocaleTimeString("zh-CN", { hour12: false })} 检查）\n${srcs}\n右键 → 检查更新 可立即重查`;
    updInfo = r;
    $("#updateResult").textContent = r.available
      ? `当前 ${installedChannel} v${r.current} → ${channel} v${r.latest}。${r.notes || ""}`
      : `已是 ${channel} 最新版 v${r.current}`;
    $("#installChecked").disabled = !r.available;
    const btn = $("#updBtn");
    if (r.available) {
      btn.textContent = `安装 ${channel} v${r.latest}`; btn.title = (r.notes || "") + "\n点击更新"; btn.style.display = "";
    } else {
      btn.style.display = "none";
      if (manual) toast(`已是最新版本 v${r.current}（悬停版本号可看各更新源结果）`);
    }
  } catch (e) {
    if (request !== updateRequest) return;
    $("#updateResult").textContent = "检查失败：" + e.message;
    if (manual) toast("检查更新失败：" + e.message);
    const v = $("#ver"); v.title = "检查更新失败：" + e.message + "\n右键 → 检查更新 可重试"; v.classList.add("updfail");
  }
}
setInterval(() => checkUpdate(false), 30 * 60 * 1000);   // 每 30 分钟查一次

async function doUpdate() {
  if (!updInfo || !updInfo.available) return checkUpdate(true);
  if (updInfo.frozen) return toast("打包版（exe）请下载新版安装包");
  const notes = updInfo.notes ? `\n\n更新内容：\n${updInfo.notes}` : "";
  if (!confirm(`安装 ${updInfo.channel} v${updInfo.latest}？程序会自动重启，自选和设置不受影响。${notes}`)) return;
  const btn = $("#updBtn");
  btn.disabled = true;
  $("#installChecked").disabled = true;
  $("#useNext").disabled = true;
  updateDialog.close();
  try {
    const r = await (await fetch(`/api/update/apply?channel=${updInfo.channel}&version=${encodeURIComponent(updInfo.latest)}`, { method: "POST" })).json();
    if (!r.ok) throw new Error(r.error || r.message || "更新正在进行");
  } catch (e) { $("#useNext").disabled = false; $("#installChecked").disabled = false; btn.disabled = false; return toast("更新失败：" + e.message); }
  const old = curVersion;
  const poll = setInterval(async () => {
    try {
      const st = await (await fetch("/api/update/status")).json();
      btn.textContent = `${st.message || "更新中"} ${st.progress || 0}%`;
      if (st.status === "idle") {
        const v = await (await fetch("/api/version")).json();
        if (v.version !== old || v.channel !== installedChannel) { clearInterval(poll); location.reload(); }
      }
      if (st.status === "error") { clearInterval(poll); btn.disabled = false; $("#useNext").disabled = false; $("#installChecked").disabled = false; toast(st.message); }
    } catch {
      // 旧服务端已退出：等新版本起来（桌面版会自动换成新窗口；浏览器版在这里刷新页面）
      try { const v = await (await fetch("/api/version")).json(); if (v.version !== old) { clearInterval(poll); location.reload(); } } catch { /* 还在重启 */ }
    }
  }, 700);
}

/* ---------- 启动 ---------- */
setSeg("#periods", "p", state.period); setSeg("#ctypes", "t", state.ctype);
renderTabs(); renderTicker(); renderWatch();
select(state.selected);
refresh(); startTimer();

/* ---------- 右键菜单 ---------- */
const menuEl = document.createElement("div");
menuEl.id = "ctxmenu";
document.body.appendChild(menuEl);

function hideMenu() { menuEl.style.display = "none"; menuEl.innerHTML = ""; }

/* items: [{ label, key, action, disabled, checked, danger, sub: [...] } | "-" | { header }] */
function buildMenu(items, el) {
  el.innerHTML = "";
  items.forEach((it) => {
    if (it === "-") { el.insertAdjacentHTML("beforeend", '<div class="sep"></div>'); return; }
    if (it.header) { el.insertAdjacentHTML("beforeend", `<div class="mh">${it.header}</div>`); return; }
    const row = document.createElement("div");
    row.className = "mi" + (it.disabled ? " dis" : "") + (it.danger ? " danger" : "") + (it.sub ? " has-sub" : "");
    row.innerHTML = `<span class="ck">${it.checked ? "✓" : ""}</span><span class="ml">${it.label}</span><span class="mk">${it.key || (it.sub ? "▸" : "")}</span>`;
    if (it.sub) {
      const sub = document.createElement("div");
      sub.className = "submenu";
      buildMenu(it.sub, sub);
      row.appendChild(sub);
    } else if (!it.disabled) {
      row.onclick = (e) => { e.stopPropagation(); hideMenu(); it.action && it.action(); };
    }
    el.appendChild(row);
  });
}

function showMenu(x, y, items) {
  buildMenu(items, menuEl);
  menuEl.style.display = "block";
  const w = menuEl.offsetWidth, h = menuEl.offsetHeight;
  menuEl.style.left = Math.min(x, innerWidth - w - 4) + "px";
  menuEl.style.top = Math.min(y, innerHeight - h - 4) + "px";
  // 子菜单靠右放不下时改到左边
  menuEl.classList.toggle("flip", x + w * 2 > innerWidth);
}
document.addEventListener("click", hideMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideMenu(); });
window.addEventListener("blur", hideMenu);
window.addEventListener("resize", hideMenu);

function copyText(t) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => {
    const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  });
  toast("已复制：" + (t.length > 40 ? t.slice(0, 40) + "…" : t));
}
function toast(msg) {
  let el = $("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("on");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 1600);
}

function groupsOf(s) { return Object.keys(state.groups).filter((g) => state.groups[g].includes(s)); }

/* 某个标的的通用菜单项 */
function symbolItems(s) {
  const q = quotes[s] || {};
  const inGroups = groupsOf(s);
  const items = [
    { header: `${q.name || displayCode(s)}  <span class="muted">${displayCode(s)}</span>` },
    { label: "打开图表", key: "Enter", action: () => select(s) },
    { label: ovList().includes(s) ? "取消叠加" : "叠加到当前图表", disabled: s === state.selected,
      action: () => (ovList().includes(s) ? removeOverlay(s) : addOverlay(s)) },
    { label: "切换周期", sub: Object.entries(PNAME).map(([p, n]) => ({ label: n, checked: state.selected === s && state.period === p,
      action: () => { state.period = p; save(); setSeg("#periods", "p", p); select(s); } })) },
    "-",
    { label: "加入分组", sub: [
      ...Object.keys(state.groups).map((g) => ({ label: g, checked: inGroups.includes(g),
        action: () => { if (inGroups.includes(g)) state.groups[g] = state.groups[g].filter((x) => x !== s);
          else state.groups[g].push(s); save(); renderTabs(); renderWatch(); toast((inGroups.includes(g) ? "已移出 " : "已加入 ") + g); } })),
      "-",
      { label: "新建分组…", action: () => { const n = prompt("新分组名称"); if (!n) return;
        state.groups[n] = state.groups[n] || []; if (!state.groups[n].includes(s)) state.groups[n].push(s);
        save(); renderTabs(); renderWatch(); toast("已加入 " + n); } },
    ] },
    { label: "复制", sub: [
      { label: "复制代码", action: () => copyText(displayCode(s).replace(" ", "")) },
      { label: "复制名称", action: () => copyText(q.name || displayCode(s)) },
      { label: "复制行情摘要", action: () => copyText(`${q.name || ""} ${displayCode(s)} 最新 ${fmt(q.price)} ${pctStr(q.pct)} 开 ${fmt(q.open)} 高 ${fmt(q.high)} 低 ${fmt(q.low)} 昨收 ${fmt(q.prevClose)} ${q.time || ""}` +
        (q.ext ? ` ${q.ext.label} ${fmt(q.ext.price)} ${pctStr(q.ext.pct)}` : "")) },
    ] },
    { label: "查看个股资讯", action: () => { select(s); const t = document.querySelector('#news [data-tab="stock"], #news .tab-stock, #news button[data-mode="stock"]');
      if (t) t.click(); else toast("已切换标的，资讯面板「个股」页查看"); } },
  ];
  return items;
}

/* 自选列表 */
$("#watch tbody").addEventListener("contextmenu", (e) => {
  const tr = e.target.closest("tr[data-s]"); if (!tr) return;
  e.preventDefault(); e.stopPropagation();
  const s = tr.dataset.s, g = state.group, list = state.groups[g], i = list.indexOf(s);
  const move = (to) => { list.splice(i, 1); list.splice(to, 0, s); state.sort = null; save(); renderWatch(); };
  showMenu(e.clientX, e.clientY, [
    ...symbolItems(s),
    "-",
    { label: "置顶", disabled: i === 0, action: () => move(0) },
    { label: "上移", disabled: i === 0, action: () => move(i - 1) },
    { label: "下移", disabled: i === list.length - 1, action: () => move(i + 1) },
    { label: "置底", disabled: i === list.length - 1, action: () => move(list.length - 1) },
    "-",
    { label: `从「${g}」移除`, danger: true, key: "Del", action: () => { state.groups[g] = list.filter((x) => x !== s); save(); renderTabs(); renderWatch(); } },
  ]);
});

/* 自选列表空白处 / 表头 */
$("#left").addEventListener("contextmenu", (e) => {
  if (e.target.closest("tbody tr[data-s], input")) return;
  e.preventDefault(); e.stopPropagation();
  const sortBy = (key, dir) => { state.sort = key ? { key, dir } : null; save(); renderWatch(); };
  showMenu(e.clientX, e.clientY, [
    { header: `自选 · ${state.group}` },
    { label: "添加标的…", action: () => $("#addInput").focus() },
    { label: "导入自选…", action: () => $("#btnImport").click() },
    { label: "导出自选", action: () => $("#btnExport").click() },
    "-",
    { label: "视图", sub: [{ label: "列表", checked: look().view === "list", action: () => setLook({ view: "list" }) },
      { label: "热力图", checked: look().view === "heat", action: () => setLook({ view: "heat" }) }] },
    { label: "显示", sub: [["spark", "日内走势小图"], ["range", "日内高低区间条"], ["pill", "涨跌幅色块"], ["change", "涨跌额"], ["prem", "ETF 溢价率"], ["dense", "紧凑行高"]]
      .map(([k, n]) => ({ label: n, checked: !!look()[k], action: () => setLook({ [k]: !look()[k] }) })) },
    { label: "外观设置…", action: () => setTimeout(() => $("#btnLook").click(), 0) },
    { label: "排序", sub: [
      { label: "涨跌幅 从高到低", checked: state.sort && state.sort.key === "pct" && state.sort.dir === -1, action: () => sortBy("pct", -1) },
      { label: "涨跌幅 从低到高", checked: state.sort && state.sort.key === "pct" && state.sort.dir === 1, action: () => sortBy("pct", 1) },
      { label: "名称", checked: state.sort && state.sort.key === "name", action: () => sortBy("name", 1) },
      { label: "自定义顺序", checked: !state.sort, action: () => sortBy(null) },
    ] },
    "-",
    { label: "整理自选（批量删除/移动）…", action: () => openManage() },
    { label: "新建分组…", action: () => $("#btnNewGroup").click() },
    { label: `重命名「${state.group}」…`, action: () => { const n = prompt("新名称", state.group); if (!n || n === state.group || state.groups[n]) return;
      state.groups[n] = state.groups[state.group]; delete state.groups[state.group]; state.group = n; save(); renderTabs(); renderWatch(); } },
    { label: `删除分组「${state.group}」`, danger: true, disabled: Object.keys(state.groups).length <= 1, action: () => {
      if (!confirm(`删除分组「${state.group}」？里面的 ${state.groups[state.group].length} 个标的会一起移除。`)) return;
      delete state.groups[state.group]; state.group = Object.keys(state.groups)[0]; save(); renderTabs(); renderWatch(); refresh(); } },
  ]);
});

/* 图表 */
$("#chart").addEventListener("contextmenu", (e) => {
  e.preventDefault(); e.stopPropagation();
  const s = state.selected, inList = (state.groups[state.group] || []).includes(s);
  const rr = () => { if (chartData) renderChart(chartData, false); };
  showMenu(e.clientX, e.clientY, [
    { header: `${(quotes[s] || {}).name || displayCode(s)} · ${PNAME[state.period]}` },
    { label: "回到最新", key: "Home", action: () => chart?.scrollToRealTime() },
    { label: "重置视图", action: () => { if (chartData) renderChart(chartData, true); } },
    { label: "叠加", sub: [
      { label: "添加标的对比…", action: () => setTimeout(() => $("#btnOverlay").click(), 0) },
      ...(window.sessionOverlayMenu?.items() || []),
      "-",
      { label: "清除所有叠加", disabled: !ovList().length && !window.sessionOverlayMenu?.active(),
        action: () => { removeOverlay(null); window.sessionOverlayMenu?.clear(); } },
    ] },
    { label: "刷新数据", key: "F5", action: () => { klineCache.delete(kkey(s, state.period)); loadChart(false); } },
    "-",
    { label: "周期", sub: Object.entries(PNAME).map(([p, n]) => ({ label: n, checked: state.period === p,
      action: () => { state.period = p; save(); setSeg("#periods", "p", p); loadChart(true); } })) },
    { label: "图形", sub: [["candle", "蜡烛"], ["hollow", "空心蜡烛"], ["bar", "美国线"], ["line", "折线"]].map(([t, n]) => ({ label: n, checked: state.ctype === t,
      action: () => { state.ctype = t; save(); setSeg("#ctypes", "t", t); rr(); } })) },
    { label: "显示均线", checked: state.showMA !== false, action: () => { state.showMA = state.showMA === false; save(); rr(); } },
    { label: "显示成交量", checked: state.showVol !== false, action: () => { state.showVol = state.showVol === false; save(); rr(); } },
    { label: "显示 IOPV 线（ETF）", checked: state.showIopv !== false, action: () => { state.showIopv = state.showIopv === false; save(); rr(); } },
    { label: "对数坐标", checked: !!state.logScale, action: () => { state.logScale = !state.logScale; save(); rr(); } },
    "-",
    { label: "保存截图", action: () => {
      if (!chart) return;
      const a = document.createElement("a");
      a.href = chart.getConvertPictureUrl(true, "png", getComputedStyle($("#chart")).backgroundColor); a.download = `${displayCode(s).replace(" ", "")}_${state.period}_${Date.now()}.png`; a.click(); } },
    { label: "复制当前价", action: () => copyText(String((quotes[s] || {}).price ?? "")) },
    inList ? { label: `从「${state.group}」移除`, danger: true, action: () => { state.groups[state.group] = state.groups[state.group].filter((x) => x !== s); save(); renderTabs(); renderWatch(); } }
      : { label: `加入「${state.group}」`, action: () => { addSymbols([s]); renderTabs(); renderWatch(); toast("已加入 " + state.group); } },
  ]);
});

/* 指数条 */
$("#ticker").addEventListener("contextmenu", (e) => {
  const el = e.target.closest(".tk");
  e.preventDefault(); e.stopPropagation();
  if (!el) return;
  const s = el.dataset.s;
  const orig = state.ticker.findIndex(([x]) => x === s || (US_FUT[x] && US_FUT[x][0] === s));
  showMenu(e.clientX, e.clientY, [
    ...symbolItems(s).slice(0, 3),
    { label: `加入「${state.group}」`, disabled: (state.groups[state.group] || []).includes(s), action: () => { addSymbols([s]); renderTabs(); renderWatch(); toast("已加入 " + state.group); } },
    "-",
    { label: "左移", disabled: orig <= 0, action: () => { const t = state.ticker.splice(orig, 1)[0]; state.ticker.splice(orig - 1, 0, t); save(); renderTicker(); } },
    { label: "右移", disabled: orig < 0 || orig >= state.ticker.length - 1, action: () => { const t = state.ticker.splice(orig, 1)[0]; state.ticker.splice(orig + 1, 0, t); save(); renderTicker(); } },
    { label: "添加到指数条…", action: () => { const raw = prompt("输入代码（如 ^HSI、600000、CL=F）"); const x = normSymbol(raw); if (!x) return;
      const name = prompt("显示名称", (quotes[x] || {}).name || displayCode(x)) || displayCode(x); state.ticker.push([x, name]); save(); renderTicker(); refresh(); } },
    { label: "从指数条移除", danger: true, disabled: orig < 0, action: () => { state.ticker.splice(orig, 1); save(); renderTicker(); } },
    { label: "恢复默认指数条", action: () => { state.ticker = structuredClone(DEFAULT_STATE.ticker); save(); renderTicker(); refresh(); } },
  ]);
});

/* 其他地方：屏蔽浏览器默认菜单，给一个全局菜单（输入框保留系统菜单以便粘贴） */
document.addEventListener("contextmenu", (e) => {
  if (e.defaultPrevented) return;
  if (e.target.closest("input, textarea")) return;
  if (e.target.closest("#news")) {   // 资讯面板：选中文字时允许复制
    const sel = String(getSelection()); e.preventDefault();
    showMenu(e.clientX, e.clientY, [
      { label: "复制选中文字", disabled: !sel, action: () => copyText(sel) },
      { label: "刷新报价", action: refresh },
    ]);
    return;
  }
  e.preventDefault();
  showMenu(e.clientX, e.clientY, [
    { label: "刷新报价", key: "F5", action: refresh },
    { label: "刷新间隔", sub: [2000, 3000, 5000, 10000].map((v) => ({ label: v / 1000 + " 秒", checked: state.interval === v,
      action: () => { state.interval = v; save(); $("#interval").value = String(v); startTimer(); } })) },
    { label: "红涨绿跌", checked: state.redUp, action: () => { $("#redUp").checked = !state.redUp; $("#redUp").onchange({ target: $("#redUp") }); } },
    "-",
    { label: "导入自选…", action: () => $("#btnImport").click() },
    { label: "导出自选", action: () => $("#btnExport").click() },
    "-",
    { label: "界面缩放", sub: [
      { label: "放大", key: "Ctrl +", action: () => setZoom((state.zoom || 1) * 1.1) },
      { label: "缩小", key: "Ctrl −", action: () => setZoom((state.zoom || 1) / 1.1) },
      { label: "自动（跟随窗口）", key: "Ctrl 0", checked: (state.zoom || 1) === 1, action: () => setZoom(1) },
    ] },
    { label: "检查更新", action: openUpdates },
    { label: "重新加载界面", key: "Ctrl+R", action: () => location.reload() },
  ]);
});
// F5 刷新数据而不是整页刷新
document.addEventListener("keydown", (e) => {
  if (e.key === "F5") { e.preventDefault(); refresh(); klineCache.delete(kkey(state.selected, state.period)); loadChart(false); toast("已刷新"); }
  if (e.key === "Home" && !e.target.closest("input, textarea")) chart?.scrollToRealTime();
});

/* ---------- 自选栏宽度：拖动左栏右边缘调整整栏宽度，双击恢复默认 ---------- */
function applyLayout() {
  const m = document.querySelector("main");
  if (state.leftW) m.style.setProperty("--leftW", state.leftW + "px"); else m.style.removeProperty("--leftW");
}
function dragger(el, onMove, onReset) {
  el.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    document.body.classList.add("resizing");
    const move = (ev) => onMove(ev);
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      document.body.classList.remove("resizing"); save(); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  });
  el.addEventListener("dblclick", (e) => { e.stopPropagation(); onReset(); applyLayout(); save(); });
  el.addEventListener("click", (e) => e.stopPropagation());
}
(() => {
  const left = $("#left");
  const sp = document.createElement("div"); sp.className = "vsplit"; sp.title = "拖动调整自选栏宽度，双击恢复默认";
  left.appendChild(sp);
  dragger(sp, (ev) => {
    const x = ev.clientX - left.getBoundingClientRect().left;
    state.leftW = Math.round(Math.min(window.innerWidth * 0.42, Math.max(220, x))); applyLayout();
  }, () => { state.leftW = null; });
  applyLayout();
})();

if (state.showPrem === false) { state.look = Object.assign(look(), { prem: false }); delete state.showPrem; save(); }
applyLook();

/* ---------- 小窗模式：同一个窗口原地缩成置顶的迷你自选，再切回完整界面 ---------- */
const desk = () => (window.pywebview && window.pywebview.api) || null;
function fillMiniGroups() {
  $("#miniGroup").innerHTML = Object.keys(state.groups).map((g) => `<option ${g === state.group ? "selected" : ""}>${g}</option>`).join("");
}
function setMini(on) {
  MINI = on;
  document.body.classList.toggle("mini", on);
  document.title = on ? "交易看板 · 小窗" : "交易看板";
  history.replaceState(null, "", on ? "/?mini=1" : "/");
  if (on) { fillMiniGroups(); pinUI(); }
  if (desk()) desk().set_mini(on, state.pin !== false);
  else if (on) toast("浏览器里无法缩小窗口，请用桌面版");
  if (!on) { applyLayout(); loadChart(true); renderTabs(); renderDetail(); }
  renderWatch();
}
function pinUI() { $("#miniPin").classList.toggle("on", state.pin !== false); }
$("#btnMini").onclick = () => setMini(true);
$("#miniMain").onclick = () => setMini(false);
$("#miniGroup").onchange = (e) => { state.group = e.target.value; save(); renderTabs(); renderWatch(); refresh(); };
$("#miniPin").onclick = () => { state.pin = state.pin === false; save(); pinUI(); if (desk()) desk().set_on_top(state.pin !== false); };
// 小窗里双击标的：回到完整界面并打开它的图表
// 小窗里双击标的回到完整界面。单击会重绘列表，浏览器的 dblclick 不可靠，所以自己判断两次点击间隔
let miniLast = { s: null, t: 0 };
$("#watch").addEventListener("mousedown", (e) => {
  if (!MINI) return;
  const tr = e.target.closest("tr[data-s]"); if (!tr) return;
  const now = Date.now(), s = tr.dataset.s;
  if (miniLast.s === s && now - miniLast.t < 450) { miniLast = { s: null, t: 0 }; setMini(false); select(s); return; }
  miniLast = { s, t: now };
}, true);
setInterval(() => { if (MINI) $("#miniClock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false }); }, 1000);
if (MINI) {
  document.body.classList.add("mini"); document.title = "交易看板 · 小窗"; fillMiniGroups(); pinUI();
  window.addEventListener("pywebviewready", () => desk() && desk().set_on_top(state.pin !== false));
}
// 命令框右边的 GO：等同回车（打开图表，不加自选）
document.querySelector(".cmd .go").addEventListener("click", () =>
  $("#addInput").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
