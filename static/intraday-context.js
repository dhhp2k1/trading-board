(() => {
  "use strict";
  const board = window.board, box = document.querySelector("#intradayContext");
  if (!board || !box) return;
  const el = (id) => document.getElementById(id);
  const references = {NQ:"纳指100期货", ES:"标普500期货", GC:"黄金期货", CL:"WTI原油期货",
    NVDA:"英伟达夜盘", AAPL:"苹果夜盘", TSLA:"特斯拉夜盘"};
  let reference = "", notice = "";
  const stock = (s) => /^(sh(?:60|68)\d{4}|sz(?:00|30)\d{4}|bj\d{6})$/.test(s);
  const pct = (v) => Number.isFinite(v) ? (v > 0 ? "+" : "") + v.toFixed(2) + "%" : "—";
  const compact = (v) => String(v || "").replace(/^(\d{4})-(\d{2})-(\d{2})/, "$1$2$3");
  let symbol, industry, session, overlay, plotted, chartKey;
  let generation = 0;
  const busy = new Map();

  function removeLine() {
    if (plotted) { chart.removeSeries(plotted); plotted = null; }
  }
  function draw(key) {
    removeLine();
    if (!overlay || key !== symbol + "|min" || !chartData?.bars?.length) return;
    const day = overlay === "industry" ? compact(industry?.day) : session?.day;
    if (!day || !/^\d{8}$/.test(day)) return;
    const iso = day.slice(0,4) + "-" + day.slice(4,6) + "-" + day.slice(6);
    const times = new Set(chartData.bars.map(b => b.time));
    const baseTime = Date.parse(iso + "T09:30:00Z") / 1000;
    const quote = board.quote();
    const prev = compact(quote?.sparkDay) === day ? quote?.prevClose : null;
    const base = overlay === "industry" ? prev : session?.basePrice;
    if (!(base > 0)) return;
    const data = new Map();
    const samples = overlay === "industry" ? (industry?.timeline || []).map(p => [p.time,p.pct]) :
      (session?.points || []).map(p => [p[0],p[2]]);
    for (const [when, change] of samples) {
      const hm = String(when).match(/(?:^|[ T])(\d\d):(\d\d)/);
      if (!hm || !Number.isFinite(change)) continue;
      const t = baseTime + (Number(hm[1])*60 + Number(hm[2]) - 570)*60;
      if (times.has(t)) data.set(t, {time:t, value:base*(1+change/100)});
    }
    if (data.size < 2) return;
    plotted = chart.addSeries(LW.LineSeries, {color:"#68c9ff", lineWidth:2, priceLineVisible:false,
      lastValueVisible:false, title:overlay === "industry" ? "行业" : references[reference]});
    plotted.setData([...data.values()].sort((a,b)=>a.time-b.time));
  }
  window.addEventListener("board:chart-clear", () => { removeLine(); chartKey = null; });
  window.addEventListener("board:chart-ready", e => { chartKey=e.detail; draw(chartKey); });
  function plot(kind) {
    overlay = overlay === kind && state.period === "min" ? null : kind;
    el("industryPlot").setAttribute("aria-pressed", String(overlay === "industry"));
    if (reference) { reference = ""; generation++; (state.sessionRefs ||= {})[symbol] = ""; save(); }
    if (overlay && state.period !== "min") document.querySelector('#periods [data-p="min"]').click();
    else draw(chartKey || shownKey);
  }
  el("industryPlot").onclick = () => plot("industry");
  function renderIndustry(d) {
    industry = d;
    el("industryName").textContent = d?.industry ? d.industry.name + " · " + d.classification : "二级行业";
    const diff = Number.isFinite(d?.stockPct) && Number.isFinite(d?.industryPct) ? d.stockPct - d.industryPct : null;
    el("industryStats").textContent = d?.industry ?
      "个股 " + pct(d.stockPct) + "　行业 " + pct(d.industryPct) +
      (diff == null ? "" : "　" + (diff >= 0 ? "领先 " : "落后 ") + Math.abs(diff).toFixed(2) + " 个百分点") +
      (d.rank ? "　同行第 " + d.rank + " / " + d.valid : "") : "";
    const today = compact(new Date(Date.now()+8*3600000).toISOString().slice(0,10));
    el("industryMeta").textContent = [d?.error || (d && !d.industry ? "申万二级成分未覆盖" : ""),
      d?.day && (compact(d.day) === today ? compact(d.day) : "历史交易日 " + compact(d.day)),
      d?.time && "个股 " + d.time.slice(-8), d?.benchmark && d.benchmark + " " + (d.benchmarkTime || "").slice(-8),
      d?.total ? "覆盖 " + d.valid + "/" + d.total : ""].filter(Boolean).join(" · ");
    el("industryMeta").title = [d?.source, d?.membershipAsOf && "成分核验 " + compact(d.membershipAsOf)].filter(Boolean).join(" · ");
    el("industryPlot").hidden = !(d?.timeline?.length > 1);
  }
  function renderSession(d) {
    session = d;
    const last = d?.points?.at(-1);
    if (!last) { notice = d?.message || "正在读取同期分时…"; return; }
    const now = new Date(Date.now() + 8*3600000).toISOString();
    const today = compact(now.slice(0,10));
    const hm = now.slice(11,16);
    const trading = (hm >= "09:30" && hm <= "11:30") || (hm >= "13:00" && hm <= "15:00");
    const delayed = d.day === today && trading &&
      Date.now() - Date.parse(now.slice(0,10)+"T"+last[0]+":00+08:00") > 5*60000;
    notice = (d.day === today ? "" : "历史 ") + d.day + " 09:30–" + last[0] +
      " · 本标的 " + pct(last[1]) + " / 参考 " + pct(last[2]) + (delayed ? " · 分钟滞后" : "");
  }

  function choose(value) {
    reference = value;
    (state.sessionRefs ||= {})[symbol] = value;
    save();
    generation++;
    session = null;
    notice = "";
    overlay = value ? "session" : null;
    removeLine();
    el("industryPlot").setAttribute("aria-pressed","false");
    if (!value) return;
    if (state.period !== "min") document.querySelector('#periods [data-p="min"]').click();
    load("session", true);
  }

  window.sessionOverlayMenu = {
    items() {
      if (!/^(sh|sz|bj)\d{6}$/.test(symbol)) return [];
      const items = [{header: "海外同期 · 北京时间 09:30 起"}];
      if (reference && notice) items.push({label:quoteText(notice), disabled:true});
      for (const [key, label] of Object.entries(references)) {
        items.push({label, checked:key === reference, action:() => choose(key === reference ? "" : key)});
      }
      return items;
    },
    active: () => Boolean(reference),
    clear() { if (reference) choose(""); }
  };

  async function load(kind, notify = false) {
    const overseas = kind === "session", sym=symbol, selected=reference;
    if (!sym || (overseas ? !selected || state.period !== "min" : !stock(sym))) return;
    const token=generation, key=[token,kind,selected].join("/");
    if (busy.has(key)) return;
    busy.set(key,true);
    const render=overseas ? renderSession : renderIndustry;
    try {
      const route=overseas ? "session-compare" : "industry-strength";
      const r=await fetch("/api/"+route+"?"+new URLSearchParams({s:sym,ref:selected}));
      const d=await r.json();
      if (token!==generation || (overseas && reference!==selected)) return;
      if(!r.ok) throw Error(d.error || "数据暂不可用");
      render(d);
      if (overseas && notify) toast(notice);
      if(overlay===kind) draw(chartKey || shownKey);
    } catch(e) {
      if(token===generation && (!overseas || reference===selected)) {
        render(overseas?{message:e.message}:{error:e.message}); if(overlay===kind) removeLine();
        if (overseas && notify) toast(notice);
      }
    } finally {busy.delete(key);}
  }
  function update() {
    const s=board.selected;
    if(s===symbol) return;
    symbol=s;generation++;overlay=null;removeLine();renderIndustry(null);renderSession(null);
    el("industryPlot").setAttribute("aria-pressed", "false");
    box.hidden = !stock(s);
    reference = state.sessionRefs?.[s] || "";
    if (!Object.hasOwn(references,reference)) reference = "";
    overlay = reference ? "session" : null;
    notice = "";
    el("industryBlock").hidden = box.hidden;
    if(stock(s)) el("industryMeta").textContent="正在查询行业与成分行情…";
    load("industry");load("session");
  }
  window.addEventListener("board:select",update);
  window.addEventListener("board:quote",() => { if(board.selected!==symbol) update(); });
  setInterval(()=>{if(!document.hidden && !MINI){load("industry");load("session");}},30000);
  update();
})();
