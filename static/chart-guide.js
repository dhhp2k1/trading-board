(function (root) {
  "use strict";

  const INTRADAY_PERIODS = new Set(["min", "m1", "m5"]);
  const SWING_PERIODS = new Set(["m15", "m30", "m60"]);
  const SWING_WINDOWS = { m15: 80, m30: 40, m60: 20 };
  const OVERLAY_IDS = [
    "boardGuideHigh",
    "boardGuideLow",
    "boardGuideDayHigh",
    "boardGuideDayCost",
    "boardGuideDayLow",
  ];
  const COST_INDICATOR = "BoardGuideCost";
  const DEFAULT_CFG = { enabled: true, levels: true, passthrough: true, badge: true };

  function isEtfSymbol(symbol, quote) {
    return Boolean(quote?.fundType) || /^(sh5|sz1)\d{5}$/.test(String(symbol || ""));
  }

  function pricePrecision(symbol, quote) {
    return isEtfSymbol(symbol, quote) ? 3 : 2;
  }

  function barDay(bar) {
    if (!bar || bar.time == null) return "";
    if (typeof bar.time === "string") return bar.time.slice(0, 10);
    if (!Number.isFinite(bar.time)) return "";
    return new Date(bar.time * 1000).toISOString().slice(0, 10);
  }

  function barClose(bar) {
    const v = bar?.close ?? bar?.value;
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function barHigh(bar) {
    const c = barClose(bar);
    const h = bar?.high;
    return Number.isFinite(h) && h > 0 ? h : c;
  }

  function barLow(bar) {
    const c = barClose(bar);
    const l = bar?.low;
    return Number.isFinite(l) && l > 0 ? l : c;
  }

  function mean(values) {
    if (!values.length) return null;
    let sum = 0;
    for (const v of values) sum += v;
    return sum / values.length;
  }

  function fmtPrice(value, prec = 2) {
    return Number.isFinite(value) ? value.toFixed(prec) : "—";
  }

  function computeDailyContext(dailyBars, livePrice, isEtf, currentSessionDay = null) {
    if (!Array.isArray(dailyBars)) return null;
    const bars = dailyBars.filter((b) => barClose(b) !== null);
    if (bars.length < 5) return null;

    const lastDay = barDay(bars[bars.length - 1]);
    const completed = (currentSessionDay && lastDay === currentSessionDay && bars.length >= 6)
      ? bars.slice(0, -1)
      : bars;

    const win = Math.min(20, completed.length);
    const recent = completed.slice(-win);
    const high20 = Math.max(...recent.map(barHigh));
    const low20 = Math.min(...recent.map(barLow));
    const prevDay = completed[completed.length - 1];
    const prevDayHigh = barHigh(prevDay);
    const prevDayLow = barLow(prevDay);

    const cWin = Math.min(20, bars.length);
    const closes = bars.map(barClose);
    const cost20 = mean(closes.slice(-cWin));
    const shift = Math.min(5, bars.length - cWin);
    let slopePct = 0;
    if (shift >= 1) {
      const prevCost20 = mean(closes.slice(bars.length - cWin - shift, bars.length - shift));
      if (prevCost20 > 0) slopePct = (cost20 / prevCost20 - 1) * 100;
    }

    const refPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : closes[closes.length - 1];
    const diffPct = (refPrice / cost20 - 1) * 100;
    const flatSlope = isEtf ? 0.35 : 0.6;
    const bandPct = isEtf ? 0.6 : 1.0;

    let state = "range";
    let label = "日线震荡";
    if ((diffPct >= bandPct && slopePct >= -flatSlope * 0.5) || (diffPct >= 0 && slopePct >= flatSlope)) {
      state = "strong";
      label = "日线偏强";
    } else if ((diffPct <= -bandPct && slopePct <= flatSlope * 0.5) || (diffPct <= 0 && slopePct <= -flatSlope)) {
      state = "weak";
      label = "日线偏弱";
    }

    const costLabel = cWin >= 20 ? "近1月成本" : `近${cWin}日成本`;
    const prec = isEtf ? 3 : 2;
    const diffStr = `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(2)}%`;
    const slopeStr = `${slopePct >= 0 ? "+" : ""}${slopePct.toFixed(2)}%`;
    const detail = `${label}（截至 ${lastDay}）：现价相对${costLabel}（${fmtPrice(cost20, prec)}）${diffStr}，成本线近期斜率 ${slopeStr}；近${win}日区间 ${fmtPrice(low20, prec)} ~ ${fmtPrice(high20, prec)}`;

    return {
      state,
      label,
      detail,
      cost20,
      high20,
      low20,
      prevDayHigh,
      prevDayLow,
      costLabel,
      win,
      diffPct,
      slopePct,
      asOf: lastDay,
    };
  }

  function computeDailyResetVwap(bars) {
    const series = [];
    let activeDay = null;
    let cumPV = 0;
    let cumVol = 0;
    let cumClose = 0;
    let count = 0;
    for (const bar of bars) {
      const c = barClose(bar);
      if (c === null) continue;
      const day = barDay(bar);
      if (day !== activeDay) {
        activeDay = day;
        cumPV = 0;
        cumVol = 0;
        cumClose = 0;
        count = 0;
      }
      const h = barHigh(bar);
      const l = barLow(bar);
      const typical = (h + l + c) / 3;
      const vol = Number.isFinite(bar.volume) && bar.volume > 0 ? bar.volume : 0;
      cumPV += typical * vol;
      cumVol += vol;
      cumClose += c;
      count++;
      const value = cumVol > 0 ? cumPV / cumVol : cumClose / count;
      series.push({ time: bar.time, value });
    }
    return series;
  }

  function computeRollingSma(bars, windowSize, progressiveWhenShort = false) {
    const valid = bars.filter((b) => barClose(b) !== null);
    if (!valid.length) return [];
    const n = Math.min(windowSize, valid.length);
    const out = [];
    let sum = 0;
    for (let i = 0; i < valid.length; i++) {
      const c = barClose(valid[i]);
      sum += c;
      if (i >= n) sum -= barClose(valid[i - n]);
      if (i >= n - 1) {
        out.push({ time: valid[i].time, value: sum / n });
      } else if (progressiveWhenShort && valid.length < windowSize) {
        out.push({ time: valid[i].time, value: sum / (i + 1) });
      }
    }
    return out;
  }

  function slopeColor(series) {
    if (!series || series.length < 2) return "#ffb830";
    const back = Math.min(5, series.length - 1);
    const curr = series[series.length - 1].value;
    const prev = series[series.length - 1 - back].value;
    return curr >= prev ? "#ffb830" : "#5cc8ff";
  }

  function computeGuide(period, bars, dailyCtx, quote, isEtf) {
    if (!Array.isArray(bars) || !bars.length) return null;
    const validBars = bars.filter((b) => barClose(b) !== null);
    if (!validBars.length) return null;

    const latestDay = barDay(validBars[validBars.length - 1]);
    let tier = "trend";
    let high = null;
    let low = null;
    let costSeries = null;
    let costValue = null;
    let costLabel = "";
    let costColor = "#ffd400";

    if (INTRADAY_PERIODS.has(period)) {
      tier = "intraday";
      costLabel = "今日均价";
      costColor = "#ffd400";
      const dayBars = validBars.filter((b) => barDay(b) === latestDay);
      const hasAvg = period === "min" && validBars.some((b) => Number.isFinite(b.avg) && b.avg > 0);
      if (hasAvg) {
        costSeries = null;
        for (let i = dayBars.length - 1; i >= 0; i--) {
          if (Number.isFinite(dayBars[i].avg) && dayBars[i].avg > 0) {
            costValue = dayBars[i].avg;
            break;
          }
        }
      } else {
        costSeries = computeDailyResetVwap(validBars);
        costValue = costSeries.length ? costSeries[costSeries.length - 1].value : null;
      }

      const firstTs = dayBars[0]?.time;
      const lastTs = dayBars[dayBars.length - 1]?.time;
      if (typeof firstTs === "number" && typeof lastTs === "number" && lastTs - firstTs >= 30 * 60) {
        const openBars = dayBars.filter((b) => b.time <= firstTs + 30 * 60);
        if (openBars.length >= 2) {
          high = { label: "早盘高点", price: Math.max(...openBars.map(barHigh)) };
          low = { label: "早盘低点", price: Math.min(...openBars.map(barLow)) };
        }
      }
      if (!high && Number.isFinite(dailyCtx?.prevDayHigh) && dailyCtx.prevDayHigh > 0) {
        high = { label: "昨高", price: dailyCtx.prevDayHigh };
      }
      if (!low && Number.isFinite(dailyCtx?.prevDayLow) && dailyCtx.prevDayLow > 0) {
        low = { label: "昨低", price: dailyCtx.prevDayLow };
      }
    } else if (SWING_PERIODS.has(period)) {
      tier = "swing";
      costLabel = "近1周成本";
      const days = [];
      const seen = new Set();
      for (const b of validBars) {
        const d = barDay(b);
        if (d && !seen.has(d)) {
          seen.add(d);
          days.push(d);
        }
      }
      const winDays = new Set(days.slice(-Math.min(5, days.length)));
      const winBars = validBars.filter((b) => winDays.has(barDay(b)));
      high = { label: "近5日高点", price: Math.max(...winBars.map(barHigh)) };
      low = { label: "近5日低点", price: Math.min(...winBars.map(barLow)) };

      const targetN = SWING_WINDOWS[period] || 20;
      const effN = validBars.length < targetN
        ? Math.min(targetN, Math.max(5, Math.floor(validBars.length / 2)))
        : targetN;
      costSeries = computeRollingSma(validBars, effN, false);
      costValue = costSeries.length ? costSeries[costSeries.length - 1].value : null;
      costColor = slopeColor(costSeries);
    } else {
      tier = "trend";
      const W = period === "month" ? 12 : 20;
      const labels = period === "week"
        ? ["近20周高点", "中期成本", "近20周低点"]
        : period === "month"
          ? ["近1年高点", "年度成本", "近1年低点"]
          : ["近20日高点", "近1月成本", "近20日低点"];
      const recent = validBars.slice(-Math.min(W, validBars.length));
      high = { label: labels[0], price: Math.max(...recent.map(barHigh)) };
      low = { label: labels[2], price: Math.min(...recent.map(barLow)) };
      costLabel = labels[1];
      costSeries = computeRollingSma(validBars, W, false);
      costValue = costSeries.length ? costSeries[costSeries.length - 1].value : null;
      costColor = slopeColor(costSeries);
    }

    const lastClose = barClose(validBars[validBars.length - 1]);
    const currentPrice = Number.isFinite(quote?.price) && quote.price > 0 ? quote.price : lastClose;
    const costDiffPct = costValue > 0 && currentPrice > 0 ? (currentPrice / costValue - 1) * 100 : null;

    let hotTag = "";
    if (costDiffPct !== null) {
      const hotLimit = tier === "intraday"
        ? (isEtf ? 1.2 : 2.5)
        : tier === "swing"
          ? (isEtf ? 2.5 : 5.0)
          : (isEtf ? 6.0 : 12.0);
      if (costDiffPct >= hotLimit) hotTag = "偏热";
      else if (costDiffPct <= -hotLimit) hotTag = "偏冷";
    }

    return {
      tier,
      high,
      low,
      costSeries,
      costValue,
      costLabel,
      costColor,
      costDiffPct,
      hotTag,
      latestDay,
    };
  }

  function computePassthrough(period, dailyCtx, currentPrice, primaryLevels, isEtf) {
    if (!INTRADAY_PERIODS.has(period) || !dailyCtx || !(currentPrice > 0)) return [];
    const maxDistPct = isEtf ? 2.5 : 3.5;
    const refs = (primaryLevels || []).filter((v) => Number.isFinite(v) && v > 0);
    const candidates = [
      { id: "boardGuideDayHigh", label: "日线压力", price: dailyCtx.high20, color: "#ff9e9e" },
      { id: "boardGuideDayCost", label: "日线成本", price: dailyCtx.cost20, color: "#e6c35c" },
      { id: "boardGuideDayLow", label: "日线防守", price: dailyCtx.low20, color: "#79b8ff" },
    ];
    return candidates.filter((c) => {
      if (!Number.isFinite(c.price) || c.price <= 0) return false;
      if (Math.abs(c.price / currentPrice - 1) * 100 > maxDistPct) return false;
      return !refs.some((r) => Math.abs(c.price / r - 1) * 100 <= 0.12);
    });
  }

  const computeApi = {
    isEtfSymbol,
    pricePrecision,
    barDay,
    computeDailyContext,
    computeGuide,
    computePassthrough,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = computeApi;
  }

  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!window.board || !document.querySelector("#btnGuide")) return;

  const btn = document.querySelector("#btnGuide");
  const badgeEl = document.querySelector("#trendBadge");
  const dailyHydrating = new Map();
  let lastGuide = null;
  let lastDailyCtx = null;
  let lastPrec = 2;

  function cfg() {
    if (!state.chartGuide || typeof state.chartGuide !== "object") {
      state.chartGuide = { ...DEFAULT_CFG };
    } else {
      for (const [k, v] of Object.entries(DEFAULT_CFG)) {
        if (typeof state.chartGuide[k] !== "boolean") state.chartGuide[k] = v;
      }
    }
    return state.chartGuide;
  }

  function clearChartGuide() {
    try {
      if (typeof chart !== "undefined" && chart) {
        for (const id of OVERLAY_IDS) chart.removeOverlay({ id });
        chart.removeIndicator(PRICE_PANE, COST_INDICATOR);
      }
    } catch {}
    lastGuide = null;
  }

  function updateButton() {
    const on = cfg().enabled;
    btn.setAttribute("aria-pressed", String(on));
    btn.classList.toggle("on", on);
  }

  function renderBadge(dailyCtx) {
    if (!badgeEl) return;
    const c = cfg();
    if (!c.enabled || !c.badge || !dailyCtx) {
      badgeEl.hidden = true;
      badgeEl.textContent = "";
      badgeEl.title = "";
      badgeEl.className = "trend-badge";
      return;
    }
    badgeEl.hidden = false;
    badgeEl.className = `trend-badge ${dailyCtx.state}`;
    badgeEl.textContent = dailyCtx.label;
    badgeEl.title = dailyCtx.detail;
  }

  function hydrateDaily(symbol) {
    if (!symbol || typeof klineCache === "undefined" || typeof fetchKline !== "function") return;
    const key = kkey(symbol, "day");
    if (klineCache.get(key)?.d?.bars?.length) return;
    if (dailyHydrating.has(symbol)) return;
    const req = fetchKline(symbol, "day").then((d) => {
      if (state.selected === symbol && d?.bars?.length) {
        refreshGuide();
        if (typeof showLegend === "function") showLegend(null);
      }
    }).catch(() => {}).finally(() => {
      dailyHydrating.delete(symbol);
    });
    dailyHydrating.set(symbol, req);
  }

  function refreshGuide() {
    try {
      updateButton();
      const c = cfg();
      const s = state.selected;
      const p = state.period;
      const quote = (typeof quotes !== "undefined" && quotes[s]) || {};
      const etf = isEtfSymbol(s, quote);
      lastPrec = pricePrecision(s, quote);

      const dailyEntry = s && typeof klineCache !== "undefined" ? klineCache.get(kkey(s, "day"))?.d : null;
      const dailyBars = p === "day" && chartData?.bars?.length ? chartData.bars : dailyEntry?.bars;
      const activeBars = typeof chartData !== "undefined" && chartData?.bars?.length ? chartData.bars : null;
      const currentSessionDay = activeBars && INTRADAY_PERIODS.has(p) ? barDay(activeBars[activeBars.length - 1]) : null;
      const dailyCtx = computeDailyContext(dailyBars, quote.price, etf, currentSessionDay);
      lastDailyCtx = dailyCtx;
      renderBadge(dailyCtx);

      if (!dailyBars?.length && s) hydrateDaily(s);

      if (!c.enabled || typeof chart === "undefined" || !chart || shownKey !== kkey(s, p) || !activeBars) {
        clearChartGuide();
        return;
      }

      const guide = computeGuide(p, activeBars, dailyCtx, quote, etf);
      lastGuide = guide;
      if (!guide) {
        clearChartGuide();
        return;
      }

      if (c.levels) {
        if (guide.costSeries?.length) {
          setChartLine(chart, COST_INDICATOR, guide.costSeries, guide.costColor, 1.5);
        } else {
          chart.removeIndicator(PRICE_PANE, COST_INDICATOR);
        }
        setPriceReference(
          chart,
          "boardGuideHigh",
          guide.high ? `${guide.high.label} ${fmtPrice(guide.high.price, lastPrec)}` : "",
          guide.high?.price ?? null,
          "#ff7875",
          [6, 4],
        );
        setPriceReference(
          chart,
          "boardGuideLow",
          guide.low ? `${guide.low.label} ${fmtPrice(guide.low.price, lastPrec)}` : "",
          guide.low?.price ?? null,
          "#4fa3ff",
          [6, 4],
        );
      } else {
        chart.removeIndicator(PRICE_PANE, COST_INDICATOR);
        chart.removeOverlay({ id: "boardGuideHigh" });
        chart.removeOverlay({ id: "boardGuideLow" });
      }

      const passthroughIds = ["boardGuideDayHigh", "boardGuideDayCost", "boardGuideDayLow"];
      for (const id of passthroughIds) chart.removeOverlay({ id });
      if (c.levels && c.passthrough) {
        const currentPrice = Number.isFinite(quote.price) && quote.price > 0
          ? quote.price
          : barClose(activeBars[activeBars.length - 1]);
        const primaryLevels = [guide.high?.price, guide.low?.price, quote.prevClose];
        const extras = computePassthrough(p, dailyCtx, currentPrice, primaryLevels, etf);
        for (const item of extras) {
          setPriceReference(
            chart,
            item.id,
            `${item.label} ${fmtPrice(item.price, lastPrec)}`,
            item.price,
            item.color,
            [2, 4],
          );
        }
      }
    } catch {}
  }

  function applyToggle(rerender) {
    save();
    updateButton();
    if (rerender && typeof chartData !== "undefined" && chartData && shownKey === kkey(state.selected, state.period)) {
      renderChart(chartData, false);
    } else {
      refreshGuide();
      if (typeof showLegend === "function") showLegend(null);
    }
  }

  function toggle() {
    cfg().enabled = !cfg().enabled;
    applyToggle(true);
  }

  function menuItems() {
    const c = cfg();
    return [
      { label: "启用辅助标注", checked: c.enabled, action: () => { c.enabled = !c.enabled; applyToggle(true); } },
      "-",
      { label: "3 条中文价位线（压力/成本/防守）", checked: c.levels, disabled: !c.enabled, action: () => { c.levels = !c.levels; applyToggle(false); } },
      { label: "日线关键位透传到日内", checked: c.passthrough, disabled: !c.enabled || !c.levels, action: () => { c.passthrough = !c.passthrough; applyToggle(false); } },
      { label: "顶部日线趋势徽章", checked: c.badge, disabled: !c.enabled, action: () => { c.badge = !c.badge; applyToggle(false); } },
    ];
  }

  function legendHtml() {
    const c = cfg();
    if (!c.enabled || !c.levels || !lastGuide) return "";
    const parts = [];
    if (lastGuide.high) {
      parts.push(`<span class="guide-hi">压力 ${fmtPrice(lastGuide.high.price, lastPrec)}</span>`);
    }
    if (Number.isFinite(lastGuide.costValue) && lastGuide.costValue > 0) {
      const diff = Number.isFinite(lastGuide.costDiffPct)
        ? ` (${lastGuide.costDiffPct >= 0 ? "+" : ""}${lastGuide.costDiffPct.toFixed(1)}%)`
        : "";
      const hot = lastGuide.hotTag ? `<b class="guide-hot">${lastGuide.hotTag}</b>` : "";
      parts.push(`<span class="guide-cost">${lastGuide.costLabel} ${fmtPrice(lastGuide.costValue, lastPrec)}${diff}${hot}</span>`);
    }
    if (lastGuide.low) {
      parts.push(`<span class="guide-lo">防守 ${fmtPrice(lastGuide.low.price, lastPrec)}</span>`);
    }
    return parts.length ? `<span class="guide-legend">${parts.join(" · ")}</span>` : "";
  }

  btn.addEventListener("click", toggle);
  btn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof showMenu === "function") showMenu(e.clientX, e.clientY, menuItems());
  });

  window.addEventListener("board:chart-clear", clearChartGuide);
  window.addEventListener("board:chart-ready", refreshGuide);
  window.addEventListener("board:select", refreshGuide);
  window.addEventListener("board:quote", refreshGuide);
  window.addEventListener("board:bar-patch", refreshGuide);

  root.chartGuide = {
    active: () => cfg().enabled,
    toggle,
    menuItems,
    legendHtml,
    refresh: refreshGuide,
    getDailyContext: () => lastDailyCtx,
    compute: computeApi,
  };

  updateButton();
})(typeof globalThis !== "undefined" ? globalThis : this);
