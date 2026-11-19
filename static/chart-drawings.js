function createChartDrawings(chart, drawings, save) {
  const tools = document.querySelector("#drawTools");
  const buttons = [...tools.querySelectorAll("[data-draw]")];
  const undo = tools.querySelector("#drawUndo");
  const hint = document.querySelector("#drawHint");
  const host = document.querySelector("#chart");
  const scale = chart.timeScale();
  let series, seriesKey, key, requestUpdate;
  let mode = null, anchor = null, cursor = null;
  const current = () => (drawings[key] || []);
  const ready = () => !!series && key === seriesKey;

  function refresh() {
    for (const button of buttons) {
      button.disabled = !ready();
      button.setAttribute("aria-pressed", String(button.dataset.draw === mode));
    }
    undo.disabled = !ready() || !current().length;
    host.classList.toggle("drawing", !!mode);
    hint.hidden = !mode;
    hint.textContent = mode === "horizontal" ? "点击价格 · Esc 取消"
      : anchor ? "点击终点 · Esc 取消" : "点击起点 · Esc 取消";
    requestUpdate?.();
  }

  function setMode(next) {
    mode = next;
    anchor = cursor = null;
    refresh();
  }

  function pointAt(param) {
    const point = param.point;
    if (!point || point.x < 0 || point.x >= scale.width() || point.y < 0 ||
        point.y >= host.clientHeight - scale.height()) return null;
    if (mode === "trend" && param.time === undefined) return null;
    const price = series.coordinateToPrice(point.y);
    return Number.isFinite(price) ? { time: param.time, price } : null;
  }

  const renderer = {
    draw(target) {
      if (!ready()) return;
      target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle = "#4fa3ff";
        ctx.lineWidth = 1.5;
        const draw = (line, preview = false) => {
          const y = series.priceToCoordinate(line.a.price);
          const horizontal = line.type === "horizontal";
          const x = horizontal ? 0 : scale.timeToCoordinate(line.a.time);
          const x2 = horizontal ? mediaSize.width : scale.timeToCoordinate(line.b.time);
          const y2 = horizontal ? y : series.priceToCoordinate(line.b.price);
          if ([x, y, x2, y2].some((value) => !Number.isFinite(value))) return;
          ctx.setLineDash(preview || horizontal ? [5, 4] : []);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        };
        current().forEach((line) => draw(line));
        if (mode === "horizontal" && cursor) draw({ type: mode, a: cursor }, true);
        if (anchor) {
          if (cursor) draw({ type: mode, a: anchor, b: cursor }, true);
          const x = scale.timeToCoordinate(anchor.time), y = series.priceToCoordinate(anchor.price);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill();
          }
        }
        ctx.restore();
      });
    },
  };
  const view = { renderer: () => renderer };
  const primitive = {
    attached(params) { requestUpdate = params.requestUpdate; },
    detached() { requestUpdate = null; },
    paneViews: () => [view],
  };

  chart.subscribeClick((param) => {
    if (!mode || !ready()) return;
    const point = pointAt(param);
    if (!point) return;
    if (mode === "trend" && !anchor) {
      anchor = point;
      refresh();
      return;
    }
    if (anchor && scale.timeToCoordinate(anchor.time) === scale.timeToCoordinate(point.time) && anchor.price === point.price) return;
    const line = mode === "trend" ? { type: mode, a: anchor, b: point } : { type: mode, a: { price: point.price } };
    (drawings[key] ||= []).push(line);
    save();
    setMode(null);
  });
  chart.subscribeCrosshairMove((param) => {
    if (!mode || !ready()) return;
    cursor = pointAt(param);
    requestUpdate?.();
  });
  for (const button of buttons) button.onclick = () => setMode(mode === button.dataset.draw ? null : button.dataset.draw);
  undo.onclick = () => {
    current().pop();
    if (!current().length) delete drawings[key];
    save(); refresh();
  };
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mode) setMode(null);
  });

  return {
    setKey(next) {
      if (key === next) return;
      key = next;
      setMode(null);
    },
    bind(next, nextKey) {
      series?.detachPrimitive(primitive);
      series = next;
      seriesKey = nextKey;
      series?.attachPrimitive(primitive);
      refresh();
    },
  };
}
