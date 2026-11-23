(() => {
  "use strict";

  const trigger = document.querySelector("#etfPeersOpen");
  const dialog = document.querySelector("#etfPeersDialog");
  const board = window.board;
  if (!trigger || !dialog || !board) return;
  const index = dialog.querySelector("#etfPeersIndex");
  const reload = dialog.querySelector("#etfPeersReload");
  const status = dialog.querySelector("#etfPeersStatus");
  const results = dialog.querySelector("#etfPeersResults");
  const notes = dialog.querySelector("#etfPeersNotes");
  const body = results.querySelector("tbody");
  const sortButtons = [...results.querySelectorAll("button[data-sort]")];
  const amountFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
  const timeText = (time) => typeof time === "string" ? time.replace(/^(\d{4})-(\d{2})-(\d{2}) /, "$1$2$3 ") : "";
  const priceText = (price) => Number.isFinite(price) ? price.toFixed(3) : "—";
  const percentText = (percent) => Number.isFinite(percent)
    ? (percent > 0 ? "+" : "") + percent.toFixed(2) + "%" : "—";
  const amountText = (amount) => {
    if (!Number.isFinite(amount)) return "—";
    if (amount >= 1e8) return amountFormatter.format(amount / 1e8) + "亿元";
    if (amount >= 1e4) return amountFormatter.format(amount / 1e4) + "万元";
    return amountFormatter.format(amount) + "元";
  };

  let anchor = null;
  let request = null;
  let rows = [];
  let sortKey = "amount";
  let ascending = false;

  function updateTrigger(symbol, quote) {
    const domestic = /^(sh|sz)\d{6}$/.test(symbol);
    // Recognize common exchange code ranges before the first quote arrives.
    const etfCode = /^(sh(?:51\d|52\d|56\d|58\d)|sz15[89])\d{3}$/.test(symbol);
    trigger.hidden = !domestic || (quote?.fundType ? quote.fundType !== "ETF" : !etfCode);
  }

  function premium(row) {
    return row.valuationTime && Number.isFinite(row.premium) ? row.premium : null;
  }

  function renderRows() {
    const sortValue = (row) => sortKey === "premium" ? premium(row) : row[sortKey];
    const latestDay = rows.flatMap((row) => row.time && Number.isFinite(row.price)
      ? [row.time.slice(0, 10)] : []).sort().at(-1);
    const sorted = [...rows].sort((left, right) => {
      const current = (row) => Boolean(latestDay && row.time?.startsWith(latestDay) && Number.isFinite(row.price));
      if (current(left) !== current(right)) return current(left) ? -1 : 1;
      const a = sortValue(left), b = sortValue(right);
      if (!Number.isFinite(a)) return Number.isFinite(b) ? 1 : 0;
      if (!Number.isFinite(b)) return -1;
      return ascending ? a - b : b - a;
    });
    for (const button of sortButtons) {
      const header = button.closest("th");
      if (button.dataset.sort === sortKey) header.setAttribute("aria-sort", ascending ? "ascending" : "descending");
      else header.removeAttribute("aria-sort");
    }
    body.replaceChildren(...sorted.map((row) => {
      const tr = document.createElement("tr");
      const name = document.createElement("button");
      name.type = "button";
      name.dataset.symbol = row.symbol;
      name.textContent = row.name || board.displayCode(row.symbol);
      name.title = "在主图查看 " + board.displayCode(row.symbol);
      if (row.symbol === anchor) {
        tr.className = "etf-current";
        name.setAttribute("aria-current", "true");
      }
      const addCell = (text, subtext) => {
        const cell = tr.insertCell();
        cell.append(text);
        if (subtext) {
          const small = document.createElement("small");
          small.textContent = subtext;
          cell.append(small);
        }
        return cell;
      };
      const security = addCell("", board.displayCode(row.symbol));
      security.prepend(name);
      addCell(priceText(row.price), row.time ? timeText(row.time) : "报价时点缺失");
      addCell(percentText(row.pct)).className = row.pct > 0 ? "up" : row.pct < 0 ? "down" : "";
      addCell(amountText(row.amount));
      addCell(priceText(row.bid) + " / " + priceText(row.ask));
      addCell(Number.isFinite(row.spreadBps) ? row.spreadBps.toFixed(2) : "—");
      const value = premium(row);
      addCell(percentText(value), value == null ? "" : timeText(row.valuationTime))
        .className = value > 0 ? "up" : value < 0 ? "down" : "";
      return tr;
    }));
  }

  async function loadPeers() {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    reload.disabled = true;
    index.hidden = results.hidden = notes.hidden = true;
    status.textContent = "正在读取 ETF 报价…";
    try {
      const response = await fetch("/api/etf-peers?s=" + encodeURIComponent(anchor), { signal: controller.signal });
      if (!response.ok) throw new Error("ETF peers unavailable");
      const data = await response.json();
      if (request !== controller || !dialog.open) return;
      if (data.error) throw new Error("ETF peers unavailable");
      if (!data.index) {
        status.textContent = "当前 ETF 尚未纳入同指数对照样本";
        return;
      }
      index.textContent = [data.index, data.market].filter(Boolean).join(" · ");
      index.hidden = false;
      rows = Array.isArray(data.rows) ? data.rows : [];
      const dated = rows.filter((row) => row.time && Number.isFinite(row.price));
      const latestDay = dated.map((row) => row.time.slice(0, 10)).sort().at(-1);
      const sameDay = dated.filter((row) => row.time.startsWith(latestDay));
      status.textContent = dated.length
        ? `${latestDay.replaceAll("-", "")} 有报价 ${sameDay.length}/${rows.length} 只` +
          (rows.length === 1 ? " · 名单中仅此一只" : "")
        : "同指数样本暂缺可用报价";
      notes.textContent = [
        "对照范围为已核验的沪深上市 ETF 样本",
        "北京时间 · 价差按买卖一档中间价折算，1 基点 = 0.01%",
        "折溢价仅在报价与 IOPV 时点相差不超过 60 秒时显示",
        data.source && "来源：" + data.source,
      ].filter(Boolean).join(" · ");
      notes.hidden = false;
      if (rows.length) {
        renderRows();
        results.hidden = false;
      }
    } catch {
      if (request === controller && dialog.open) status.textContent = "ETF 对照暂不可用，请刷新报价重试";
    } finally {
      if (request === controller) reload.disabled = false;
    }
  }

  trigger.addEventListener("click", () => {
    anchor = board.selected;
    dialog.showModal();
    loadPeers();
  });
  reload.addEventListener("click", loadPeers);
  dialog.addEventListener("close", () => {
    if (!dialog.open) request?.abort();
  });
  body.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-symbol]");
    if (!button) return;
    dialog.close();
    board.select(button.dataset.symbol);
  });
  for (const button of sortButtons) {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      ascending = key === sortKey ? !ascending : key === "spreadBps";
      sortKey = key;
      renderRows();
    });
  }
  window.addEventListener("board:quote", (event) => updateTrigger(event.detail.symbol, event.detail.quote));
  updateTrigger(board.selected, board.quote());
})();
