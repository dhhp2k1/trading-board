// 投资日历：顶栏"日历"按钮 + 下一个重要事件倒计时 + 弹出面板。数据来自 /api/calendar（ecocal.py）。
// 只依赖 window.board（打开财报对应个股的图表），其余自成一体；样式在 ecocal.css。
(() => {
  const LS = "board.ecocal.v1";
  const REG = { CN: "中国", US: "美国", EU: "欧元区", JP: "日本", GB: "英国", HK: "香港", AU: "澳洲", CA: "加拿大",
    CH: "瑞士", NZ: "新西兰", KR: "韩国", IN: "印度", GL: "全球", XX: "其他" };
  const REG_CHIPS = ["CN", "US", "EU", "JP", "GB", "HK", "OTHER"];
  const TYPES = { data: "数据", cb: "央行", event: "事件", earn: "财报", holiday: "休市", expiry: "交割", mine: "我的" };
  const WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const DAY = 86400000;

  const st = Object.assign({ imp: 3, range: "w2", regions: [], types: [], custom: [] }, load());
  let data = { events: [], sources: {} }, loading = false, lastFetch = 0, open = false;

  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }
  function save() { localStorage.setItem(LS, JSON.stringify(st)); }
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d); };

  // ---------- 界面骨架 ----------
  const btn = document.createElement("button");
  btn.id = "ecoBtn"; btn.className = "minibtn"; btn.textContent = "▦ 日历";
  btn.title = "投资日历：央行议息、重要经济数据、大公司财报、休市与交割日（也可在命令框输入 ECO 回车）";
  const next = document.createElement("span");
  next.id = "ecoNext"; next.title = "下一个重要事件，点击打开日历";
  const topbar = $("#topbar");
  if (topbar) {
    const mini = $("#btnMini");
    mini ? mini.after(btn) : topbar.prepend(btn);
    const clocks = $("#clocks");
    clocks ? topbar.insertBefore(next, clocks) : topbar.append(next);
  }

  const box = document.createElement("div");
  box.id = "ecocal";
  box.innerHTML = `
    <div class="ec-head">
      <span class="ec-brand">投资日历</span>
      <span class="ec-seg" id="ecRange">
        <button data-r="y">昨天</button><button data-r="d">今天</button><button data-r="d2">明天</button>
        <button data-r="w">本周</button><button data-r="w2">两周</button>
      </span>
      <span class="ec-seg" id="ecImp" title="重要度筛选">
        <button data-i="3">★★★ 只看重要</button><button data-i="2">★★ 以上</button><button data-i="1">全部</button>
      </span>
      <span class="ec-sp"></span>
      <span class="ec-clock" id="ecClock"></span>
      <button id="ecReload" title="重新获取">↻</button>
      <button id="ecClose" title="关闭（Esc）">✕</button>
    </div>
    <div class="ec-bar">
      <span class="ec-chips" id="ecRegions"></span>
      <span class="ec-div"></span>
      <span class="ec-chips" id="ecTypes"></span>
      <span class="ec-sp"></span>
      <input id="ecQ" placeholder="搜索事件" spellcheck="false">
      <button id="ecAddBtn" class="ec-chip">＋ 添加事件</button>
    </div>
    <form class="ec-add" id="ecAdd">
      <input type="date" id="ecAddDate" required>
      <input type="time" id="ecAddTime" title="留空表示全天">
      <input id="ecAddTitle" placeholder="事件，如：XX 公司股东大会 / 自己的复盘提醒" required>
      <select id="ecAddImp"><option value="3">★★★ 重要</option><option value="2">★★ 关注</option><option value="1">★ 一般</option></select>
      <button type="submit" class="ec-chip on">保存</button>
      <span class="muted">保存在本机，只有你看得到</span>
    </form>
    <div class="ec-days" id="ecDays"></div>
    <div class="ec-body" id="ecBody"></div>
    <div class="ec-foot"><span id="ecSrc"></span><span class="muted">时间为本机时区 · 数据：金十 / ForexFactory / 纳斯达克 / 各央行与交易所公告</span></div>`;
  document.body.append(box);

  $("#ecRegions", box).innerHTML = `<button class="ec-chip" data-reg="">全部地区</button>` +
    REG_CHIPS.map((r) => `<button class="ec-chip" data-reg="${r}">${r === "OTHER" ? "其他" : REG[r]}</button>`).join("");
  $("#ecTypes", box).innerHTML = `<button class="ec-chip" data-typ="">全部类型</button>` +
    Object.entries(TYPES).map(([k, v]) => `<button class="ec-chip" data-typ="${k}">${v}</button>`).join("");

  // ---------- 数据 ----------
  function watchSet() {
    try {
      const b = JSON.parse(localStorage.getItem("board.v1")) || {};
      return new Set(Object.values(b.groups || {}).flat());
    } catch { return new Set(); }
  }

  async function fetchData(force) {
    if (loading) return;
    loading = true; $("#ecReload", box).classList.add("spin");
    try {
      const from = addDays(today(), -1);
      const r = await fetch(`/api/calendar?from=${from}&days=16${force ? "&force=1" : ""}`);
      const j = await r.json();
      if (j.events) { data = j; lastFetch = Date.now(); }
      else if (j.error) data.error = j.error;
    } catch (e) { data.error = String(e); }
    loading = false; $("#ecReload", box).classList.remove("spin");
    render(); renderNext();
  }

  function allEvents() {
    const ws = watchSet();
    const evs = data.events.map((e) => {
      const x = Object.assign({}, e);
      if (x.type === "earn" && x.sym && ws.has(x.sym)) { x.imp = 3; x.mine = true; }
      if (x.ts) x.date = ymd(new Date(x.ts * 1000)); // 按本机时区归日
      return x;
    });
    for (const c of st.custom) {
      let ts = null;
      if (c.time) ts = Math.floor(new Date(`${c.date}T${c.time}:00`).getTime() / 1000);
      evs.push({ id: c.id, ts, date: c.date, allDay: !c.time, region: "XX", type: "mine", imp: +c.imp || 2,
        title: c.title, src: "我的", custom: true, prev: "", fcst: "", actual: "" });
    }
    evs.sort((a, b) => a.date.localeCompare(b.date) || (a.allDay ? 0 : 1) - (b.allDay ? 0 : 1) ||
      (a.ts || 0) - (b.ts || 0) || b.imp - a.imp);
    return evs;
  }

  function rangeOf(r) {
    const t = today(), d = new Date();
    if (r === "y") return [addDays(t, -1), t];
    if (r === "d") return [t, addDays(t, 1)];
    if (r === "d2") return [addDays(t, 1), addDays(t, 2)];
    if (r === "w") return [t, addDays(t, 7 - ((d.getDay() + 6) % 7))]; // 到本周日
    return [t, addDays(t, 15)];
  }

  function pass(e, withRange = true) {
    if (e.imp < st.imp) return false;
    if (withRange) { const [a, b] = rangeOf(st.range); if (e.date < a || e.date >= b) return false; }
    if (st.regions.length && !e.custom && !st.regions.includes(REG_CHIPS.includes(e.region) ? e.region : "OTHER")) return false;
    if (st.types.length && !st.types.includes(e.type)) return false;
    const q = $("#ecQ", box).value.trim().toLowerCase();
    if (q && !`${e.title} ${e.titleEn || ""} ${REG[e.region] || ""}`.toLowerCase().includes(q)) return false;
    return true;
  }

  // ---------- 渲染 ----------
  function countdown(sec) {
    if (sec <= 0) return "";
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.ceil(sec % 3600 / 60);
    if (d) return `${d}天${h}时`;
    if (h) return `${h}时${pad(m === 60 ? 59 : m)}分`;
    return `${m}分`;
  }

  function cmp(actual, fcst) {
    const a = parseFloat(String(actual).replace(/[^\d.\-]/g, "")), f = parseFloat(String(fcst).replace(/[^\d.\-]/g, ""));
    if (isNaN(a) || isNaN(f) || a === f) return "";
    return a > f ? `<i class="ec-gt">▲</i>` : `<i class="ec-lt">▼</i>`;
  }

  function dayLabel(s) {
    const d = new Date(s + "T00:00:00"), t = today();
    const rel = s === t ? "今天" : s === addDays(t, 1) ? "明天" : s === addDays(t, -1) ? "昨天" : s === addDays(t, 2) ? "后天" : "";
    return `${s.slice(5)} ${WD[d.getDay()]}${rel ? " · " + rel : ""}`;
  }

  function render() {
    if (!open) return;
    box.querySelectorAll("#ecRange button").forEach((b) => b.classList.toggle("on", b.dataset.r === st.range));
    box.querySelectorAll("#ecImp button").forEach((b) => b.classList.toggle("on", +b.dataset.i === st.imp));
    box.querySelectorAll("[data-reg]").forEach((b) => b.classList.toggle("on", b.dataset.reg ? st.regions.includes(b.dataset.reg) : !st.regions.length));
    box.querySelectorAll("[data-typ]").forEach((b) => b.classList.toggle("on", b.dataset.typ ? st.types.includes(b.dataset.typ) : !st.types.length));

    const evs = allEvents();
    const now = Date.now() / 1000, t = today();
    // 日期条：未来 14 天每天的重要事件数
    const strip = [];
    for (let i = -1; i < 14; i++) {
      const s = addDays(t, i), d = new Date(s + "T00:00:00");
      const day = evs.filter((e) => e.date === s && pass(e, false));
      const top = day.filter((e) => e.imp >= 3).length;
      const off = day.some((e) => e.type === "holiday" && /休市/.test(e.title));
      strip.push(`<div class="ec-day${s === t ? " today" : ""}${d.getDay() % 6 === 0 ? " wkend" : ""}" data-day="${s}">
        <b>${WD[d.getDay()].slice(1)}</b><span>${s.slice(5)}</span>
        <em>${top ? "●".repeat(Math.min(top, 5)) : day.length ? "·" : ""}${off ? "<u>休</u>" : ""}</em></div>`);
    }
    $("#ecDays", box).innerHTML = strip.join("");

    const shown = evs.filter((e) => pass(e));
    const nextId = (shown.find((e) => e.ts && e.ts > now) || {}).id;
    let html = "", cur = "";
    const [ra, rb] = rangeOf(st.range);
    let todayDone = !(t >= ra && t < rb) || shown.some((e) => e.date === t);
    const emptyToday = () => `<tr class="ec-dh"><td colspan="8">${dayLabel(t)}<span class="muted"> · 没有符合条件的事件</span></td></tr>`;
    for (const e of shown) {
      if (!todayDone && e.date > t) { html += emptyToday(); todayDone = true; }
      if (e.date !== cur) {
        cur = e.date;
        const n = shown.filter((x) => x.date === cur).length;
        html += `<tr class="ec-dh" id="ecd-${cur}"><td colspan="8">${dayLabel(cur)}<span class="muted"> · ${n} 项</span></td></tr>`;
      }
      const tm = e.ts ? new Date(e.ts * 1000) : null;
      const past = e.ts ? e.ts < now - 60 : e.date < t;
      const soon = e.ts && e.ts > now && e.ts - now < 3600;
      const cd = e.ts ? (e.ts > now ? countdown(e.ts - now) : e.actual ? "已公布" : now - e.ts < 1800 ? "刚刚" : "") : "";
      const reg = e.custom ? "我的" : (REG[e.region] || e.region);
      const tag = e.type === "data" || e.type === "event" ? "" : `<span class="ec-tag t-${e.type}">${TYPES[e.type]}</span>`;
      const cls = ["ec-r", `imp${e.imp}`, past ? "past" : "", soon ? "soon" : "", e.id === nextId ? "next" : "", e.sym ? "link" : ""].join(" ");
      html += `<tr class="${cls}" data-id="${esc(e.id)}"${e.sym ? ` data-sym="${esc(e.sym)}"` : ""} title="${esc((e.titleEn ? e.titleEn + " · " : "") + "来源：" + e.src)}">
        <td class="ec-t">${e.id === nextId ? "▶" : ""}${tm ? `${pad(tm.getHours())}:${pad(tm.getMinutes())}` : "全天"}</td>
        <td class="ec-reg r-${e.region}">${esc(reg)}</td>
        <td class="ec-imp">${"★".repeat(e.imp)}<span>${"★".repeat(3 - e.imp)}</span></td>
        <td class="ec-ti">${tag}${esc(e.title)}${e.mine ? ` <span class="ec-tag t-mine">自选</span>` : ""}${e.custom ? ` <a class="ec-del" data-del="${esc(e.id)}" title="删除">✕</a>` : ""}</td>
        <td class="ec-n">${esc(e.prev)}${e.prev && e.unit && e.unit !== "EPS" ? esc(e.unit) : ""}</td>
        <td class="ec-n">${esc(e.fcst)}${e.fcst && e.unit && e.unit !== "EPS" ? esc(e.unit) : ""}</td>
        <td class="ec-n ec-a">${e.actual ? esc(e.actual) + (e.unit && e.unit !== "EPS" ? esc(e.unit) : "") + cmp(e.actual, e.fcst) : ""}</td>
        <td class="ec-cd">${cd}</td></tr>`;
    }
    if (!todayDone && shown.length) html += emptyToday();
    const head = `<thead><tr><th>时间</th><th>地区</th><th>重要</th><th>事件</th><th class="r">前值</th><th class="r">预期</th><th class="r">公布</th><th class="r">倒计时</th></tr></thead>`;
    const empty = loading && !data.events.length ? "正在获取…" :
      data.error && !data.events.length ? `获取失败：${esc(data.error)}` :
      st.imp === 3 ? "这段时间没有重要事件，可切到「★★ 以上」或「全部」看看" : "没有符合条件的事件";
    $("#ecBody", box).innerHTML = shown.length ? `<table>${head}<tbody>${html}</tbody></table>` : `<div class="ec-empty">${empty}</div>`;

    const src = Object.entries(data.sources || {}).map(([k, v]) =>
      `<span class="${v.ok ? "ok" : "bad"}" title="${esc(v.err || "")}">${esc(k)} ${v.ok ? v.n : "✕"}</span>`).join("");
    $("#ecSrc", box).innerHTML = src + (lastFetch ? `<span class="muted">更新于 ${new Date(lastFetch).toTimeString().slice(0, 5)}</span>` : "");
  }

  function renderNext() {
    const now = Date.now() / 1000;
    const e = allEvents().find((x) => x.imp >= 3 && x.ts && x.ts > now - 60);
    if (!e) { next.innerHTML = ""; next.style.display = "none"; return; }
    const tm = new Date(e.ts * 1000);
    const left = e.ts - now;
    const when = e.date === today() ? `${pad(tm.getHours())}:${pad(tm.getMinutes())}` : `${e.date.slice(5)} ${pad(tm.getHours())}:${pad(tm.getMinutes())}`;
    next.style.display = "";
    next.className = left < 900 ? "hot" : left < 3600 ? "warm" : "";
    next.innerHTML = `<b>${when}</b> ${esc(e.custom ? "" : (REG[e.region] || ""))}${esc(e.title)} <i>${left > 0 ? countdown(left) : "即将公布"}</i>`;
  }

  function show(on) {
    open = on ?? !open;
    box.classList.toggle("on", open);
    btn.classList.toggle("on", open);
    if (open) {
      render();
      if (Date.now() - lastFetch > 60000) fetchData();
      requestAnimationFrame(() => { const n = $("#ecBody tr.next", box); if (n) n.scrollIntoView({ block: "center" }); });
    }
  }

  // ---------- 交互 ----------
  btn.addEventListener("click", () => show());
  next.addEventListener("click", () => show(true));
  $("#ecClose", box).onclick = () => show(false);
  $("#ecReload", box).onclick = () => fetchData(true);
  $("#ecRange", box).onclick = (ev) => { const b = ev.target.closest("button"); if (b) { st.range = b.dataset.r; save(); render(); } };
  $("#ecImp", box).onclick = (ev) => { const b = ev.target.closest("button"); if (b) { st.imp = +b.dataset.i; save(); render(); } };
  const toggle = (arr, v) => { if (!v) return []; const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); return arr; };
  $("#ecRegions", box).onclick = (ev) => { const b = ev.target.closest("button"); if (b) { st.regions = toggle(st.regions, b.dataset.reg); save(); render(); } };
  $("#ecTypes", box).onclick = (ev) => { const b = ev.target.closest("button"); if (b) { st.types = toggle(st.types, b.dataset.typ); save(); render(); } };
  $("#ecQ", box).oninput = () => render();
  $("#ecDays", box).onclick = (ev) => {
    const d = ev.target.closest("[data-day]"); if (!d) return;
    const s = d.dataset.day, [a, b] = rangeOf(st.range);
    if (s < a || s >= b) { st.range = s === today() ? "d" : s === addDays(today(), -1) ? "y" : "w2"; save(); render(); }
    const row = $(`#ecd-${s}`, box);
    if (row) row.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  $("#ecBody", box).onclick = (ev) => {
    const del = ev.target.closest("[data-del]");
    if (del) { st.custom = st.custom.filter((c) => c.id !== del.dataset.del); save(); render(); renderNext(); return; }
    const tr = ev.target.closest("tr[data-sym]");
    if (tr && window.board && window.board.select) { window.board.select(tr.dataset.sym); show(false); }
  };
  $("#ecAddBtn", box).onclick = () => {
    const f = $("#ecAdd", box); f.classList.toggle("on");
    if (f.classList.contains("on")) { $("#ecAddDate", box).value ||= today(); $("#ecAddTitle", box).focus(); }
  };
  $("#ecAdd", box).onsubmit = (ev) => {
    ev.preventDefault();
    const title = $("#ecAddTitle", box).value.trim(), date = $("#ecAddDate", box).value;
    if (!title || !date) return;
    st.custom.push({ id: "my|" + Date.now(), date, time: $("#ecAddTime", box).value, title, imp: $("#ecAddImp", box).value });
    save(); $("#ecAddTitle", box).value = ""; $("#ecAdd", box).classList.remove("on"); render(); renderNext();
  };
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && open && !ev.target.closest("dialog")) { show(false); return; }
    // 彭博习惯：命令框输入 ECO / 日历 回车打开
    if (ev.key === "Enter" && ev.target.id === "addInput" && /^(eco|cal|日历|rl)$/i.test(ev.target.value.trim())) {
      ev.preventDefault(); ev.stopImmediatePropagation(); ev.target.value = ""; show(true);
      const sg = $("#suggest"); if (sg) sg.style.display = "none";
    }
  }, true);

  setInterval(() => {
    const c = $("#ecClock", box); if (c && open) c.textContent = new Date().toTimeString().slice(0, 8);
  }, 1000);
  setInterval(() => {
    renderNext();
    if (open) render();
    // 打开时每分钟刷新（公布值），关着时每 10 分钟刷新一次倒计时用的数据
    if (Date.now() - lastFetch > (open ? 60000 : 600000)) fetchData();
  }, 20000);
  if (!new URLSearchParams(location.search).has("mini")) setTimeout(() => fetchData(), 1500);
})();
