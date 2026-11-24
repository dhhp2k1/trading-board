function createChartDrawings(chart, drawings, save) {
  const tools = document.querySelector("#drawTools");
  const host = document.querySelector("#chart");
  const buttons = [...tools.querySelectorAll("[data-draw]")];
  const undo = tools.querySelector("#drawUndo");
  const groupId = "boardDrawings";
  let key, displayedKey, activeId, mode;
  const current = () => drawings[key] || [];
  const ready = () => !!key && key === displayedKey;
  const idFor = (index) => groupId + index;
  const point = (p) => ({ value: p.price, ...(p.time === undefined ? {} : { timestamp: chartTimestamp(p.time) }) });

  function refresh() {
    for (const button of buttons) {
      button.disabled = !ready();
      button.setAttribute("aria-pressed", String(button.dataset.draw === mode));
    }
    undo.disabled = !ready() || !current().length;
    host.classList.toggle("drawing", !!mode);
  }

  function cancel() {
    if (activeId) chart.removeOverlay({ id: activeId });
    activeId = mode = null;
    refresh();
  }

  function lineSpec(type, id) {
    const horizontal = type === "horizontal";
    return {
      id, groupId, name: horizontal ? "horizontalStraightLine" : "segment",
      lock: true, needDefaultPointFigure: false, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false,
      onRightClick: () => true,
      styles: { line: { color: "#4fa3ff", size: 1.5, style: horizontal ? "dashed" : "solid", dashedValue: [5, 4] } },
    };
  }

  for (const button of buttons) button.onclick = () => {
    if (!ready()) return;
    const type = button.dataset.draw;
    const wasActive = mode === type;
    cancel();
    if (wasActive) return;
    mode = type;
    activeId = idFor(current().length);
    const id = chart.createOverlay({
      ...lineSpec(type, activeId),
      onDrawEnd: ({ overlay }) => {
        const [a, b] = overlay.points;
        if (overlay.paneId !== PRICE_PANE || !Number.isFinite(a?.value) ||
            (type === "trend" && !Number.isFinite(b?.value))) {
          cancel();
          return;
        }
        const data = chart.getDataList();
        const storedPoint = ({ timestamp, dataIndex, value }) => {
          const t = timestamp ?? data[Math.max(0, Math.min(dataIndex ?? data.length - 1, data.length - 1))].timestamp;
          return { time: typeof data[0].boardTime === "string" ? new Date(t).toISOString().slice(0, 10) : t / 1000, price: value };
        };
        const line = type === "horizontal" ? { type, a: { price: a.value } }
          : { type, a: storedPoint(a), b: storedPoint(b) };
        if (line.b && line.a.time === line.b.time && line.a.price === line.b.price) {
          cancel();
          return;
        }
        (drawings[key] ||= []).push(line);
        activeId = mode = null;
        save();
        refresh();
      },
    }, PRICE_PANE);
    if (!id) cancel();
    refresh();
  };

  undo.onclick = () => {
    if (!ready() || !current().length) return;
    cancel();
    chart.removeOverlay({ id: idFor(current().length - 1) });
    current().pop();
    if (!current().length) delete drawings[key];
    save();
    refresh();
  };
  document.addEventListener("keydown", event => { if (event.key === "Escape" && activeId) cancel(); });
  refresh();

  return {
    setKey(next) {
      if (key === next) return;
      key = next;
      cancel();
    },
    bind(next) {
      if (next !== displayedKey) {
        cancel();
        chart.removeOverlay({ groupId });
        displayedKey = next;
      }
      if (ready()) {
        const timestamps = new Set(chart.getDataList().map(bar => bar.timestamp));
        current().forEach((line, index) => {
          if (chart.getOverlayById(idFor(index))) return;
          if (!line.a || (line.type !== "horizontal" && !line.b)) return;
          const points = line.type === "horizontal" ? [point(line.a)] : [point(line.a), point(line.b)];
          if (points.some(p => p.timestamp !== undefined && !timestamps.has(p.timestamp))) return;
          chart.createOverlay({ ...lineSpec(line.type, idFor(index)), points }, PRICE_PANE);
        });
      }
      refresh();
    },
  };
}
