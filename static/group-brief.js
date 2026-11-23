(() => {
  "use strict";

  const panel = document.querySelector("#groupBrief");
  if (!panel) return;
  const breadth = document.querySelector("#groupBreadth");
  const coverage = document.querySelector("#groupCoverage");
  const reference = document.querySelector("#groupReference");
  const overnight = document.querySelector("#groupOvernight");
  const minute = 60 * 1000;
  const shanghaiOffset = 8 * 60 * minute;
  const formatPct = (value) => (value > 0 ? "+" : "") + value.toFixed(2) + "%";
  const formatDay = (day) => day.replaceAll("-", "");
  let snapshot = { symbols: [], quotes: {} };
  let comparison = null;

  function groupStats({ symbols, quotes }, now) {
    const mainland = [...new Set(symbols.filter((symbol) => /^(sh|sz|bj)\d{6}$/.test(symbol)))];
    const local = new Date(now + shanghaiOffset);
    const day = local.toISOString().slice(0, 10);
    const midnight = Date.parse(day) - shanghaiOffset;
    const sinceMidnight = (now - midnight) / minute;
    const session = sinceMidnight < 780 ? [570, 690] : [780, 900];
    const earliest = midnight + Math.max(session[0], Math.min(sinceMidnight, session[1]) - 5) * minute;
    const valid = [];
    if (local.getUTCDay() !== 0 && local.getUTCDay() !== 6 && sinceMidnight >= 570) {
      for (const symbol of mainland) {
        const quote = quotes[symbol];
        if (!quote || quote.source !== "腾讯" || quote.sparkDay !== day || quote.open <= 0 ||
            quote.volume <= 0 || !Number.isFinite(quote.open) || !Number.isFinite(quote.volume) ||
            !Number.isFinite(quote.pct) || !Number.isFinite(quote.timestamp)) continue;
        const time = quote.timestamp * 1000;
        if (time >= earliest && time <= now + 30 * 1000) valid.push({ pct: quote.pct, time });
      }
    }
    const percentages = valid.map((quote) => quote.pct).sort((a, b) => a - b);
    const mid = Math.floor(percentages.length / 2);
    return {
      day, total: mainland.length, valid,
      median: percentages.length % 2 ? percentages[mid] : (percentages[mid - 1] + percentages[mid]) / 2,
      up: percentages.filter((pct) => pct > 0).length,
    };
  }

  function renderComparison(day) {
    if (!day) {
      comparison = null;
      overnight.className = "";
      overnight.textContent = "有当日 A 股有效行情后显示";
      return;
    }
    const key = day + "/" + reference.value;
    if (comparison?.key === key && Date.now() < comparison.expires) return;
    const request = { key, expires: Infinity };
    comparison = request;
    overnight.className = "";
    overnight.textContent = "正在读取常规时段收盘";
    const query = new URLSearchParams({ s: reference.value, day });
    fetch("/api/group-reference?" + query)
      .then(async (response) => {
        if (!response.ok) throw new Error("reference unavailable");
        return (await response.json()).reference;
      })
      .then((result) => {
        if (comparison !== request) return;
        request.expires = Date.now() + 5 * minute;
        overnight.textContent = result
          ? `${formatDay(result.day)}（美东）收盘 ${formatPct(result.pct)} · 较 ${formatDay(result.previousDay)}`
          : "近期缺少可用的美股常规收盘";
        overnight.className = result?.pct > 0 ? "up" : result?.pct < 0 ? "down" : "";
      })
      .catch(() => {
        if (comparison !== request) return;
        request.expires = Date.now() + minute;
        overnight.textContent = "美股收盘数据暂不可用";
      });
  }

  function render() {
    if (!panel.open || panel.getClientRects().length === 0) return;
    const stats = groupStats(snapshot, Date.now());
    const count = stats.valid.length;
    breadth.textContent = count ? `中位涨跌 ${formatPct(stats.median)} · 上涨 ${stats.up}/${count}` : "暂无同日有效行情";
    breadth.className = stats.median > 0 ? "up" : stats.median < 0 ? "down" : "";
    if (count) {
      const times = stats.valid.map((quote) => quote.time + shanghaiOffset);
      const clock = (time) => new Date(time).toISOString().slice(11, 19);
      const start = clock(Math.min(...times));
      const end = clock(Math.max(...times));
      const span = start === end ? start : start + "–" + end;
      coverage.textContent = `${formatDay(stats.day)} ${span} 北京时间 · 覆盖 ${count}/${stats.total} · 腾讯`;
    } else {
      coverage.textContent = stats.total ? `A 股市场标的覆盖 0/${stats.total} · 开盘后等候有效报价` : "当前组无 A 股市场标的";
    }
    renderComparison(count ? stats.day : null);
  }

  coverage.title = "仅统计沪深京当日有成交、且距盘中当前时间不超过 5 分钟的报价。午休和收盘后以该时段结束时间为准。";
  overnight.title = "取 A 股该交易日开盘前已结束的最近一场美股常规交易，与上一场常规交易收盘比较。数据来自雅虎。";
  document.addEventListener("board:watch-quotes", (event) => {
    snapshot = event.detail;
    if ([...reference.options].some((option) => option.value === snapshot.reference)) {
      reference.value = snapshot.reference;
    }
    render();
  });
  reference.addEventListener("change", () => {
    document.dispatchEvent(new CustomEvent("board:group-reference", { detail: reference.value }));
    render();
  });
  panel.addEventListener("toggle", render);
  panel.hidden = false;
})();
