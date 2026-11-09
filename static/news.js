/* 资讯面板：Bloomberg 风格快讯流 + 个股新闻。只依赖 /api/news，不改 app.js。
 * 读取 app.js 的全局 state / quotes（若存在）来知道当前选中的标的和自选名称，用于"个股"页和高亮。 */
(() => {
  const root = document.getElementById("news");
  if (!root) return;

  const LS = "board.news.v1";
  const SRC_CODE = { cls: "CLS", jin10: "JIN10", wscn: "WSCN", sina: "SINA", mw: "MKTW", wsj: "WSJ", em: "EM", yahoo: "YHOO" };
  const prefs = Object.assign(
    { tab: "flash", off: [], hotOnly: false, wide: false, q: "", tr: true },
    (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } })(),
  );
  const savePrefs = () => localStorage.setItem(LS, JSON.stringify(prefs));

  let flash = [], stock = [], stockSym = "", sources = [], available = [], trInfo = null;
  const opened = new Set(), bodyZh = new Map(), bodyBusy = new Set();
  const isEnglish = (t) => !!t && !/[\u4e00-\u9fff]/.test(t) && (t.match(/[A-Za-z]/g) || []).length >= 6;
  let seen = new Set(), firstLoad = true, stockLoading = false, unread = 0, lastOk = 0;

  root.innerHTML = `
    <div class="ph nw-head">
      <span class="nw-brand">资讯</span>
      <button class="nw-tab" data-tab="flash">快讯 <b class="nw-unread"></b></button>
      <button class="nw-tab" data-tab="stock">个股</button>
      <span class="nw-sp"></span>
      <span class="nw-clock"></span>
      <button class="nw-btn" data-act="wide" title="放大 / 还原">⤢</button>
    </div>
    <div class="nw-bar">
      <span class="nw-srcs"></span>
      <button class="nw-chip nw-hot" data-act="hot" title="只看重要">★ 重要</button>
      <button class="nw-chip nw-tr" data-act="tr" title="英文标题翻译成中文（原文显示在下面）">译</button>
      <input class="nw-q" placeholder="过滤…" spellcheck="false">
    </div>
    <div class="nw-list"></div>
    <div class="nw-foot"></div>`;
  const $n = (s) => root.querySelector(s);
  const list = $n(".nw-list");

  /* ---------- 工具 ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  function fmtTime(sec) {
    if (!sec) return "--:--";
    const d = new Date(sec * 1000), now = new Date();
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return d.toDateString() === now.toDateString() ? hm : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  }
  function appState() {
    try { if (typeof state !== "undefined" && state) return state; } catch { /* 无 */ }
    try { return JSON.parse(localStorage.getItem("board.v1")) || {}; } catch { return {}; }
  }
  function appQuotes() {
    try { if (typeof quotes !== "undefined" && quotes) return quotes; } catch { /* 无 */ }
    return {};
  }
  function selected() {
    const b = window.board;
    const s = (b && b.selected) || appState().selected || "";
    const q = (b && b.quote && b.quote(s)) || appQuotes()[s] || {};
    const el = document.getElementById("cName");
    const name = q.name || (el && el.textContent !== "—" ? el.textContent : "");
    return { sym: s, name: name || "" };
  }
  // 自选里的名称做成高亮词（"腾讯控股" 也匹配 "腾讯"）
  function watchWords() {
    const st = appState(), qs = appQuotes(), words = new Map();
    for (const syms of Object.values(st.groups || {})) {
      for (const s of syms) {
        const n = (qs[s] && qs[s].name) || "";
        if (/^[一-龥]/.test(n)) {
          const clean = n.replace(/[-－]?(W|SW|S|U|WR)$/i, "").replace(/\s+/g, "");
          words.set(clean, s);
          const short = clean.replace(/(控股|集团|股份|科技|有限公司|公司)$/, "");
          if (short.length >= 2) words.set(short, s);
        }
        if (s.startsWith("yf:") && /^[A-Z]{2,5}$/.test(s.slice(3))) words.set(s.slice(3), s);
      }
    }
    wordSym = words;
    return [...words.keys()].filter((w) => w.length >= 2).sort((a, b) => b.length - a.length);
  }
  let wordSym = new Map();
  let wordRe = null, wordKey = "";
  function refreshWords() {
    const w = watchWords(), key = w.join("|");
    if (key === wordKey) return;
    wordKey = key;
    wordRe = w.length ? new RegExp(w.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).map((x) => /^[A-Z]+$/.test(x) ? `\\b${x}\\b` : x).join("|"), "g") : null;
  }
  function mark(s) {
    const e = esc(s);
    return wordRe ? e.replace(wordRe, (m) => `<mark data-sym="${esc(wordSym.get(m) || "")}" title="点击查看图表">${m}</mark>`) : e;
  }

  /* ---------- 渲染 ---------- */
  function renderBar() {
    root.classList.toggle("wide", !!prefs.wide);
    root.querySelectorAll(".nw-tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === prefs.tab));
    $n(".nw-hot").classList.toggle("on", prefs.hotOnly);
    $n(".nw-tr").classList.toggle("on", prefs.tr);
    const srcs = $n(".nw-srcs");
    if (prefs.tab === "flash") {
      const st = Object.fromEntries(sources.map((s) => [s.id, s]));
      srcs.innerHTML = available.map((a) => {
        const s = st[a.id], bad = s && !s.ok;
        return `<button class="nw-chip${prefs.off.includes(a.id) ? "" : " on"}${bad ? " bad" : ""}" data-src="${a.id}"
          title="${esc(bad ? "失败：" + s.error : a.name)}">${SRC_CODE[a.id] || a.id}</button>`;
      }).join("");
    } else {
      const { sym, name } = selected();
      srcs.innerHTML = `<span class="nw-sym">${esc(name || sym || "未选中")}</span>`;
    }
  }

  function renderList() {
    refreshWords();
    const q = prefs.q.trim().toLowerCase();
    let items = prefs.tab === "flash" ? flash.filter((i) => [i.src, ...(i.alsoSrc || [])].some((x) => !prefs.off.includes(x))) : stock;
    if (prefs.hotOnly) items = items.filter((i) => i.level >= (prefs.tab === "flash" ? 2 : 1));
    if (q) items = items.filter((i) => (i.title + " " + i.text + " " + (i.titleZh || "")).toLowerCase().includes(q));
    if (!items.length) {
      const loading = prefs.tab === "flash" ? firstLoad : stockLoading;
      list.innerHTML = `<div class="nw-empty">${loading ? "加载中…" : "暂无资讯"}</div>`;
      return;
    }
    const keepTop = list.scrollTop;
    list.innerHTML = items.slice(0, 200).map((i) => {
      const orig = i.title || i.text;
      const zh = prefs.tr && i.titleZh ? i.titleZh : "";
      const head = zh || orig;
      const body = i.title && i.text ? i.text : "";
      const hit = wordRe && (wordRe.lastIndex = 0, wordRe.test(head + body));
      const cls = ["nw-item", "lv" + i.level, hit ? "hit" : "", i._new ? "new" : "", opened.has(i.id) ? "open" : ""].join(" ");
      const bz = bodyZh.get(i.id);
      const trBtn = body && isEnglish(body) && !bz
        ? `<button class="nw-trb" data-act="trbody" ${bodyBusy.has(i.id) ? "disabled" : ""}>${bodyBusy.has(i.id) ? "翻译中…" : "翻译正文"}</button>` : "";
      return `<div class="${cls}" data-id="${esc(i.id)}">
        <span class="nw-t">${fmtTime(i.time)}</span><span class="nw-s s-${esc(i.src)}" title="${esc(i.srcName + (i.also ? "，另见 " + i.also.join("、") : ""))}">${esc(SRC_CODE[i.src] || i.srcName)}${i.also ? `<i class="nw-also">+${i.also.length}</i>` : ""}</span>
        <div class="nw-c"><div class="nw-h">${mark(head)}</div>${zh ? `<div class="nw-o" title="${esc(orig)}">${esc(orig)}</div>` : ""}${bz ? `<div class="nw-b nw-bz">${mark(bz)}</div>` : ""}${body ? `<div class="nw-b">${mark(body)}</div>` : ""}
        <div class="nw-acts">${i.url ? `<a class="nw-a" href="${esc(i.url)}" target="_blank" rel="noopener">原文 ↗</a>` : ""}${trBtn}</div></div>
      </div>`;
    }).join("");
    list.scrollTop = keepTop;
    items.forEach((i) => { i._new = false; });
  }

  function renderFoot() {
    const bad = sources.filter((s) => !s.ok);
    const age = lastOk ? Math.round((Date.now() - lastOk) / 1000) : null;
    $n(".nw-foot").innerHTML =
      (age == null ? "" : `更新于 ${age}s 前`) +
      (prefs.tr && trInfo && trInfo.pending ? ` · 翻译中 ${trInfo.pending}` : "") +
      (prefs.tr && trInfo && trInfo.error ? ` · <span class="nw-err" title="${esc(trInfo.error)}">翻译暂停</span>` : "") +
      (bad.length ? ` · <span class="nw-err" title="${esc(bad.map((b) => b.id + ": " + b.error).join("\n"))}">${bad.length} 个来源失败</span>` : "");
    const u = $n(".nw-unread");
    u.textContent = unread ? unread : "";
  }
  const renderAll = () => { renderBar(); renderList(); renderFoot(); };

  // 展开后点"翻译正文"：按需翻译这一条的正文
  async function translateBody(id) {
    const it = flash.concat(stock).find((x) => x.id === id);
    if (!it || bodyBusy.has(id)) return;
    bodyBusy.add(id); renderList();
    try {
      const j = await getJSON("/api/news?tr_text=" + encodeURIComponent((it.text || "").slice(0, 3000)));
      if (j.zh) bodyZh.set(id, j.zh);
    } catch (e) {
      bodyZh.set(id, "（翻译失败：" + (e.message || e) + "）");
    }
    bodyBusy.delete(id); renderList();
  }

  // 标题还在后台翻译时，2 秒后再拉一次，翻好的马上显示（不用等 15 秒）
  let quickTimer = null;
  function quickRepoll() {
    if (quickTimer || !prefs.tr || !trInfo || !trInfo.pending) return;
    quickTimer = setTimeout(() => {
      quickTimer = null;
      if (prefs.tab === "stock") loadStock(true); else loadFlash();
    }, 2000);
  }

  /* ---------- 拉数据 ---------- */
  async function getJSON(url) {
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
  }

  async function loadFlash() {
    try {
      const j = await getJSON("/api/news" + (prefs.tr ? "" : "?tr=0"));
      sources = j.sources || []; available = j.available || available; trInfo = j.translate; quickRepoll();
      let fresh = 0;
      for (const it of j.items) {
        if (!seen.has(it.id)) { seen.add(it.id); if (!firstLoad) { it._new = true; fresh++; } }
      }
      const old = new Map(flash.map((i) => [i.id, i]));
      flash = j.items.map((i) => (old.has(i.id) && !i._new ? Object.assign(i, { _new: false }) : i));
      if (fresh && (prefs.tab !== "flash" || list.scrollTop > 40)) unread += fresh;
      if (fresh) notifyHot(j.items.filter((i) => i._new && i.level >= 2));
      lastOk = Date.now(); firstLoad = false;
    } catch (e) {
      sources = [{ id: "server", ok: false, error: String(e.message || e) }];
    }
    if (prefs.tab === "flash") renderAll(); else renderFoot();
  }

  async function loadStock(force) {
    const { sym, name } = selected();
    if (!sym) return;
    if (!force && sym === stockSym && stock.length) return;
    if (sym !== stockSym) { stock = []; stockSym = sym; }
    stockLoading = true;
    if (prefs.tab === "stock" && !stock.length) renderAll();
    try {
      const j = await getJSON(`/api/news?s=${encodeURIComponent(sym)}&n=${encodeURIComponent(name)}${prefs.tr ? "" : "&tr=0"}`);
      if (sym !== stockSym) return;
      stock = j.items; sources = j.sources || []; lastOk = Date.now(); trInfo = j.translate; quickRepoll();
    } catch (e) {
      sources = [{ id: "server", ok: false, error: String(e.message || e) }];
    }
    stockLoading = false;
    if (prefs.tab === "stock") renderAll();
  }

  // 重要快讯：标题闪一下（窗口不在前台时也能看到）
  let titleTimer = null;
  function notifyHot(items) {
    if (!items.length || !document.hidden) return;
    const orig = document.title.replace(/^【.*?】/, "");
    document.title = `【${(items[0].title || items[0].text).slice(0, 20)}】${orig}`;
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => { document.title = orig; }, 60000);
  }

  /* ---------- 交互 ---------- */
  root.addEventListener("click", (e) => {
    const m = e.target.closest("mark[data-sym]");
    if (m && m.dataset.sym && window.board && window.board.select) { window.board.select(m.dataset.sym); return; }
    const t = e.target.closest("button, .nw-item, a");
    if (!t) return;
    if (t.tagName === "A") return; // 原文链接
    if (t.dataset.tab) {
      prefs.tab = t.dataset.tab; savePrefs();
      if (prefs.tab === "flash") { unread = 0; list.scrollTop = 0; } else loadStock(false);
      renderAll(); return;
    }
    if (t.dataset.src) {
      const id = t.dataset.src;
      prefs.off = prefs.off.includes(id) ? prefs.off.filter((x) => x !== id) : [...prefs.off, id];
      savePrefs(); renderAll(); return;
    }
    if (t.dataset.act === "tr") { prefs.tr = !prefs.tr; savePrefs(); renderAll(); if (prefs.tr) loadFlash(); return; }
    if (t.dataset.act === "hot") { prefs.hotOnly = !prefs.hotOnly; savePrefs(); renderAll(); return; }
    if (t.dataset.act === "wide") { prefs.wide = !prefs.wide; savePrefs(); renderBar(); return; }
    if (t.dataset.act === "trbody") { translateBody(t.closest(".nw-item").dataset.id); return; }
    if (t.classList.contains("nw-item")) {
      const id = t.dataset.id;
      if (opened.has(id)) opened.delete(id); else opened.add(id);
      t.classList.toggle("open", opened.has(id));
    }
  });
  $n(".nw-q").value = prefs.q;
  $n(".nw-q").addEventListener("input", (e) => { prefs.q = e.target.value; savePrefs(); renderList(); });
  list.addEventListener("scroll", () => { if (list.scrollTop < 40 && unread && prefs.tab === "flash") { unread = 0; renderFoot(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && prefs.wide) { prefs.wide = false; savePrefs(); renderBar(); } });

  /* ---------- 定时 ---------- */
  setInterval(() => {
    const d = new Date();
    $n(".nw-clock").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    renderFoot();
  }, 1000);
  setInterval(loadFlash, 15000); // 窗口在后台也拉，重要快讯会在标题栏提醒
  setInterval(() => { if (prefs.tab === "stock" && !document.hidden) loadStock(true); }, 120000);
  // 跟随左侧选中的标的（app.js 会发 board:select 事件；另有轮询兜底）
  let lastSel = "";
  window.addEventListener("board:select", () => {
    lastSel = selected().sym;
    if (prefs.tab === "stock") { loadStock(false); renderBar(); } else stockSym = "";
  });
  setInterval(() => {
    const s = selected().sym;
    if (s !== lastSel) { lastSel = s; if (prefs.tab === "stock") loadStock(false); else stockSym = ""; }
  }, 1000);

  renderAll();
  loadFlash();
  if (prefs.tab === "stock") loadStock(true);
})();
