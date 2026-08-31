(() => {
  const hero = () => document.querySelector("[data-model-timeline-hero]");
  const tooltipImageCache = new Map();

  const chartPoints = (chart) =>
    chart.series.flatMap((series) => series.points || []);

  const preloadTooltipImage = (url, priority = "low") => {
    if (!url || tooltipImageCache.has(url)) return;

    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = priority;
    tooltipImageCache.set(url, image);
    image.src = url;
  };

  const warmTooltipImages = (chart, selectedPoint) => {
    const container = chart.renderTo;
    const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const saveData = navigator.connection?.saveData;

    if (!canHover || saveData || container.dataset.modelTimelineImagesWarmed === "true") {
      return;
    }

    container.dataset.modelTimelineImagesWarmed = "true";

    const selectedYear = selectedPoint?.x ?? 0;
    const urls = chartPoints(chart)
      .slice()
      .sort((left, right) => Math.abs(left.x - selectedYear) - Math.abs(right.x - selectedYear))
      .map((point) => point.custom?.tooltipImage || point.options?.custom?.tooltipImage)
      .filter((url, index, all) => url && all.indexOf(url) === index);

    const start = () => {
      let cursor = 0;

      const next = () => {
        if (cursor >= urls.length) return;

        const url = urls[cursor++];
        preloadTooltipImage(url, cursor === 1 ? "high" : "low");

        const cached = tooltipImageCache.get(url);
        if (cached?.complete) {
          next();
        } else {
          cached?.addEventListener("load", next, { once: true });
          cached?.addEventListener("error", next, { once: true });
        }
      };

      Array.from({ length: 4 }, next);
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 1200 });
    } else {
      window.setTimeout(start, 250);
    }
  };

  const pointLabel = (point) => {
    const model = point.custom || point.options?.custom || {};
    return [model.model || point.name, model.year, model.category]
      .filter(Boolean)
      .join(", ");
  };

  const syncPointState = (selectedPoint) => {
    const points = chartPoints(selectedPoint.series.chart);

    points.forEach((point) => {
      const element = point.graphic?.element;
      if (!element) return;

      const selected = point === selectedPoint;
      element.setAttribute("aria-pressed", String(selected));
      element.setAttribute("tabindex", selected ? "0" : "-1");
    });
  };

  const enhanceChart = (chart) => {
    const points = chartPoints(chart);
    const selected = points.find((point) => point.selected) || points[0];

    points.forEach((point, index) => {
      const element = point.graphic?.element;
      if (!element) return;

      element.setAttribute("role", "button");
      element.setAttribute("focusable", "true");
      element.setAttribute("aria-label", pointLabel(point));
      element.setAttribute("aria-pressed", String(point === selected));
      element.setAttribute("tabindex", point === selected ? "0" : "-1");

      if (element.dataset.modelTimelineKeyboard === "true") return;
      element.dataset.modelTimelineKeyboard = "true";

      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          point.select(true, false);
          window.ModelTimeline.select(point);
          return;
        }

        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + direction + points.length) % points.length;
        const nextElement = points[nextIndex].graphic?.element;

        element.setAttribute("tabindex", "-1");
        nextElement?.setAttribute("tabindex", "0");
        nextElement?.focus();
      });
    });

    warmTooltipImages(chart, selected);
  };

  const setText = (root, selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value ?? "";
  };

  const updateImage = (root, model) => {
    const image = root.querySelector("[data-model-timeline-image]");
    if (!image || image.tagName !== "IMG") return;

    if (!model.image) {
      image.hidden = true;
      return;
    }

    root.classList.add("is-updating");

    const reveal = () => {
      image.hidden = false;
      root.classList.remove("is-updating");
    };

    image.addEventListener("load", reveal, { once: true });
    image.addEventListener("error", reveal, { once: true });
    image.src = model.image;
    image.alt = model.model || "Selected vehicle";

    if (image.complete) reveal();
  };

  const updateLink = (root, url) => {
    const link = root.querySelector("[data-model-timeline-link]");
    if (!link) return;

    if (url) {
      link.href = url;
      link.hidden = false;
    } else {
      link.removeAttribute("href");
      link.hidden = true;
    }
  };

  window.ModelTimeline = {
    select(point) {
      const root = hero();
      const model = point?.custom || point?.options?.custom || {};
      if (!root) return;

      setText(root, "[data-model-timeline-name]", model.model || point?.name);
      setText(root, "[data-model-timeline-category]", model.category);
      setText(root, "[data-model-timeline-description]", model.description);
      setText(root, "[data-model-timeline-watermark]", model.year);
      updateImage(root, model);
      updateLink(root, model.url);
      syncPointState(point);
    }
  };

  const reflowCharts = (container) => {
    if (!window.Highcharts?.charts) return;

    window.Highcharts.charts
      .filter(Boolean)
      .filter((chart) => container.contains(chart.renderTo))
      .forEach((chart) => {
        chart.reflow();
        enhanceChart(chart);
      });
  };

  document.addEventListener("DOMContentLoaded", () => {
    const chartRegion = document.querySelector(".model-timeline-chart");
    if (!chartRegion || !("ResizeObserver" in window)) return;

    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => reflowCharts(chartRegion));
    });

    observer.observe(chartRegion);
    requestAnimationFrame(() => reflowCharts(chartRegion));
  });
})();
