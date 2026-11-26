const PRICE_PANE = "candle_pane";
const CHART_FONT = "Cascadia Mono, Consolas, Microsoft YaHei UI";
const PRICE_TYPES = { candle: "candle_solid", hollow: "candle_up_stroke", bar: "ohlc", line: "area" };

function chartTimestamp(time) {
  return typeof time === "number" ? time * 1000 : Date.parse(time + "T00:00:00Z");
}

function chartBar(bar, previous) {
  const close = bar.close ?? bar.value;
  return {
    timestamp: chartTimestamp(bar.time),
    boardTime: bar.time,
    open: bar.open ?? close,
    high: bar.high ?? close,
    low: bar.low ?? close,
    close,
    volume: bar.volume ?? 0,
    volumeUp: bar.value === undefined ? close >= bar.open : !previous || bar.value >= previous.value,
  };
}

function indicatorLineStyle(color, size = 1) {
  return { color, size, style: "solid", smooth: false, dashedValue: [2, 2] };
}

function createMainChart(host) {
  const library = window.klinecharts;
  const chart = library.init(host, { locale: "zh-CN", timezone: "UTC", styles: "dark" });
  if (!chart) throw new Error("KLineChart 初始化失败");
  chart.setStyles({
    candle: { tooltip: { showRule: "none" }, priceMark: { high: { show: false }, low: { show: false } } },
    indicator: { tooltip: { showRule: "none" } },
    xAxis: { tickText: { family: CHART_FONT, size: 11 } },
    yAxis: { tickText: { family: CHART_FONT, size: 11 } },
  });
  library.registerIndicator({ name: "BoardIopvRange", series: "price", precision: 8, calc: () => [] });

  library.registerIndicator({
    name: "BoardVolume",
    series: "volume",
    precision: 0,
    minValue: 0,
    shouldFormatBigNumber: true,
    figures: [{
      key: "volume", title: "", type: "bar",
      styles: ({ current }, indicator) => ({ color: current.kLineData?.volumeUp ? indicator.extendData.up : indicator.extendData.down }),
    }],
    calc: bars => bars.map(({ volume }) => ({ volume })),
  });
  library.registerOverlay({
    name: "boardReference",
    totalStep: 2,
    createPointFigures: ({ coordinates: [point], bounding, overlay }) => [
      { type: "line", ignoreEvent: true, attrs: { coordinates: [{ x: 0, y: point.y }, { x: bounding.width, y: point.y }] } },
      { type: "text", ignoreEvent: true, attrs: { x: bounding.width - 6, y: point.y - 2, align: "right", baseline: "bottom", text: overlay.extendData } },
    ],
  });
  new ResizeObserver(() => chart.resize()).observe(host);
  return chart;
}

let chartEventRegistered = false;
function registerChartEvent() {
  if (chartEventRegistered) return;
  window.klinecharts.registerOverlay({
    name: "boardEvent",
    totalStep: 2,
    needDefaultPointFigure: false,
    createPointFigures: ({ coordinates: [point], bounding, overlay }) => {
      if (!point || point.x < 0 || point.x > bounding.width) return [];
      const align = point.x > bounding.width / 2 ? "right" : "left";
      return [
        { type: "line", ignoreEvent: true, attrs: { coordinates: [{ x: point.x, y: 0 }, { x: point.x, y: bounding.height }] } },
        { type: "text", ignoreEvent: true, attrs: {
          x: point.x + (align === "left" ? 5 : -5), y: 6, align, baseline: "top", text: overlay.extendData,
        } },
      ];
    },
  });
  chartEventRegistered = true;
}

const EVENT_OVERLAY_ID = "boardSelectedEvent";
function showChartEvent(chart, index, label) {
  registerChartEvent();
  const bar = chart.getDataList()[index];
  chart.removeOverlay({ id: EVENT_OVERLAY_ID });
  chart.createOverlay({
    id: EVENT_OVERLAY_ID, name: "boardEvent", lock: true,
    points: [{ timestamp: bar.timestamp, value: bar.close }],
    extendData: label,
    styles: {
      line: { color: "#4fa3ff", size: 1, style: "dashed", dashedValue: [4, 3] },
      text: { color: "#4fa3ff", backgroundColor: "#121a24" },
    },
  }, PRICE_PANE);
  const width = chart.getSize(PRICE_PANE, "main").width;
  const x = chart.convertToPixel({ dataIndex: index }, { paneId: PRICE_PANE }).x;
  if (Number.isFinite(x) && width > 0) chart.scrollByDistance(width / 2 - x);
}

const chartLineNames = new Set();
function setChartLine(chart, name, data, color, size = 1) {
  const points = new Map(data.map(({ time, value }) => [chartTimestamp(time), value]));
  if (!chartLineNames.has(name)) {
    window.klinecharts.registerIndicator({
      name, series: "price", precision: 8, figures: [{ key: "price", title: "", type: "line" }],
      calc: (bars, indicator) => bars.map(({ timestamp }) => ({ price: indicator.extendData.get(timestamp) })),
    });
    chartLineNames.add(name);
  }
  const spec = { name, extendData: points, styles: { lines: [indicatorLineStyle(color, size)] } };
  if (chart.getIndicatorByPaneId(PRICE_PANE, name)) chart.overrideIndicator(spec, PRICE_PANE);
  else chart.createIndicator(spec, true, { id: PRICE_PANE });
}

function setPriceReference(chart, id, title, price, color, dashedValue) {
  if (!Number.isFinite(price) || price <= 0) {
    chart.removeOverlay({ id });
    return;
  }
  const points = [{ value: price }];
  const styles = { line: { color, size: 1, style: "dashed", dashedValue }, text: { color, backgroundColor: "transparent" } };
  const existing = chart.getOverlayById(id);
  if (existing) {
    if (existing.points[0]?.value !== price || existing.extendData !== title || existing.styles?.line?.color !== color) {
      chart.overrideOverlay({ id, points, extendData: title, styles });
    }
  } else chart.createOverlay({
    id, name: "boardReference", lock: true, points, extendData: title, styles,
  }, PRICE_PANE);
}
