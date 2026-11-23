(() => {
  "use strict";
  const board = window.board, box = document.querySelector("#intradayContext");
  if (!board || !box) return;
  const el = (id) => document.getElementById(id);
  const ref = el("sessionRef");
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
      lastValueVisible:false, title:overlay === "industry" ? "行业" : ref.selectedOptions[0].text});
    plotted.setData([...data.values()].sort((a,b)=>a.time-b.time));
  }
  window.addEventListener("board:chart-clear", () => { removeLine(); chartKey = null; });
  window.addEventListener("board:chart-ready", e => { chartKey=e.detail; draw(chartKey); });
  function plot(kind) {
    overlay = overlay === kind && state.period === "min" ? null : kind;
    el("industryPlot").setAttribute("aria-pressed", String(overlay === "industry"));
    el("sessionPlot").setAttribute("aria-pressed", String(overlay === "session"));
    if (overlay && state.period !== "min") document.querySelector('#periods [data-p="min"]').click();
    else draw(chartKey || shownKey);
  }
  el("industryPlot").onclick = () => plot("industry");
  el("sessionPlot").onclick = () => plot("session");

  function suggested(s, name) {
    if (/纳指|纳斯达克|光模块|中际旭创|新易盛|天孚通信/.test(name)) return "NQ";
    if (/标普500|标准普尔500/i.test(name) || s === "sh513500") return "ES";
    if (/黄金/.test(name)) return "GC";
    if (/原油/.test(name)) return "CL";
    return "";
  }
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
    session=d;
    const last=d?.points?.at(-1);
    el("sessionStats").textContent = last ? "本标的 " + pct(last[1]) + "　参考 " + pct(last[2]) : "";
    const day=d?.day, now=new Date(Date.now()+8*3600000).toISOString(), today=compact(now.slice(0,10));
    const delayed=last && day===today && ((now.slice(11,16)>="09:30" && now.slice(11,16)<="11:30") ||
      (now.slice(11,16)>="13:00" && now.slice(11,16)<="15:00")) &&
      (Date.now()-Date.parse(now.slice(0,10)+"T"+last[0]+":00+08:00")>5*60000);
    el("sessionMeta").textContent = [day && (day===today?day:"历史交易日 "+day), last && "09:30–"+last[0]+" 北京时间",
      delayed && "共同分钟滞后", d?.message, d?.source].filter(Boolean).join(" · ");
    el("sessionMeta").title = d ? "境内最新分钟 " + (d.cnLast || "—") + "，海外最新分钟 " + (d.refLast || "—") : "";
    el("sessionPlot").hidden=!last;
  }

  async function load(kind) {
    const overseas = kind === "session", sym=symbol, selected=ref.value;
    if (!sym || box.hidden || (overseas ? !selected : !stock(sym))) return;
    const token=generation, key=[token,kind,selected].join("/");
    if (busy.has(key)) return;
    busy.set(key,true);
    const render=overseas ? renderSession : renderIndustry;
    try {
      const route=overseas ? "session-compare" : "industry-strength";
      const r=await fetch("/api/"+route+"?"+new URLSearchParams({s:sym,ref:selected}));
      const d=await r.json();
      if (token!==generation || (overseas && ref.value!==selected)) return;
      if(!r.ok) throw Error(d.error || "数据暂不可用");
      render(d);
      if(overlay===kind) draw(chartKey || shownKey);
    } catch(e) {
      if(token===generation && (!overseas || ref.value===selected)) {
        render(overseas?{message:e.message}:{error:e.message}); if(overlay===kind) removeLine();
      }
    } finally {busy.delete(key);}
  }
  function update() {
    const s=board.selected;
    if(s===symbol) return;
    symbol=s;generation++;overlay=null;removeLine();renderIndustry(null);renderSession(null);
    for(const id of ["industryPlot","sessionPlot"]) el(id).setAttribute("aria-pressed","false");
    box.hidden=!/^(sh|sz|bj)\d{6}$/.test(s);
    if(box.hidden) return;
    el("industryBlock").hidden=!stock(s);
    ref.value=state.sessionRefs?.[s] ?? suggested(s,board.quote()?.name || "");
    if(stock(s)) el("industryMeta").textContent="正在查询行业与成分行情…";
    load("industry");load("session");
  }
  ref.onchange=()=>{(state.sessionRefs ||= {})[symbol]=ref.value;save();renderSession(null);
    if(overlay==="session") {overlay=null;removeLine();el("sessionPlot").setAttribute("aria-pressed","false");} load("session");};
  window.addEventListener("board:select",update);
  window.addEventListener("board:quote",() => {
    if(board.selected!==symbol) return update();
    if(!box.hidden && !ref.value && state.sessionRefs?.[symbol]===undefined) {
      ref.value=suggested(symbol,board.quote()?.name || ""); if(ref.value) load("session");
    }
  });
  setInterval(()=>{if(!document.hidden && !MINI){load("industry");load("session");}},30000);
  update();
})();
