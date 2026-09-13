<script>
(() => {
  "use strict";

  const root = document.querySelector("[data-rd3m-story]");
  if (!root) return;

  fetch(root.dataset.source)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    })
    .then(startStory)
    .catch((error) => {
      root.innerHTML = `<p class="story-error">Could not load the story: ${error.message}</p>`;
    });

  function startStory(data) {
    const portfolio = data.portfolio;
    const focal = data.focal;
    const storyRows = data.story.rows;
    const focalPeriod = data.metadata.focal_period;

    const scenes = [
      {
        id: "portfolio",
        step: "1 · Portfolio risk",
        title: "Risk depends on the horizon",
        text: "A portfolio can be measured with RD1M, RD2M, RD3M, or another forward horizon. Here we use RD3M: among loans alive today, how many default during the next three months?",
        formula: "RD3Mₜ = defaults during t, t+1, t+2 / loans alive at t",
        mode: "portfolio"
      },
      {
        id: "focus",
        step: "2 · One month",
        title: "Open one point on the line",
        text: "Take one calendar month in the middle of the series. Its portfolio RD3M is a single number, but that number mixes loans originated at different times and observed at different ages.",
        formula: `${monthLabel(focalPeriod)} · portfolio RD3M`,
        mode: "focus"
      },
      {
        id: "loans",
        step: "3 · The loans inside",
        title: "The point is made of individual loans",
        text: "Each loan is alive in the focal month and has a three-month outcome: default or no default. The same calendar period contains loans from different cohorts and different ages.",
        formula: "loan → cohort · age · period · default in next 3 months",
        mode: "loans"
      },
      {
        id: "cells",
        step: "4 · Group the loans",
        title: "Collapse loans into cohort × age cells",
        text: "Loans sharing cohort and age form one cell. Each cell has its own RD3M and contributes to the portfolio value according to how many loans are at risk.",
        formula: "portfolio RD3M = weighted mean of cell RD3M",
        mode: "cells"
      },
      {
        id: "vintage",
        step: "5 · Add nearby periods",
        title: "A few consecutive months reveal the vintage geometry",
        text: "Now add February, March, April, May, and June 2020. Cohort runs down the rows, age across the columns, and equal calendar periods form diagonals.",
        formula: "period = cohort + age",
        mode: "matrix"
      },
      {
        id: "logit",
        step: "6 · Prepare the decomposition",
        title: "Move RD3M onto an additive scale",
        text: "The table now becomes the calculation workspace. First apply the small add-half correction, then transform the adjusted probability with the logit. New columns appear only when we need them.",
        formula: "q = (defaults + 0.5)/(n + 1)   →   y = logit(q)",
        mode: "apc",
        columns: ["cohort", "age", "period", "loans_at_risk", "defaults_3m", "rd3m", "q", "y_logit"]
      },
      {
        id: "mean",
        step: "7 · Baseline",
        title: "Start from one weighted level",
        text: "All visible logit values contribute to μ, weighted by loans at risk. Subtracting μ from every cell produces the first residual column.",
        formula: "μ = Σ(nᵢ yᵢ)/Σnᵢ   →   residual = y − μ",
        mode: "apc",
        columns: ["cohort", "age", "period", "loans_at_risk", "y_logit", "mu", "residual_after_mean"],
        highlight: "all"
      },
      {
        id: "age",
        step: "8 · AGE",
        title: "Rows with the same age explain the first residual",
        text: "For each age, illuminate the cells that share that age and take their weighted residual. The AGE column appears, then a new residual carries forward what AGE did not explain.",
        formula: "AGEₐ = weighted mean(residual after μ | age = a)",
        mode: "apc",
        columns: ["cohort", "age", "period", "residual_after_mean", "age_effect", "residual_after_age"],
        highlight: "age"
      },
      {
        id: "cohort",
        step: "9 · COHORT",
        title: "Cohort works on what AGE left behind",
        text: "Now illuminate cells from the same origination month. Their weighted residual becomes the COHORT effect. We subtract it and continue with the remaining variation.",
        formula: "COHORT꜀ = weighted mean(residual after AGE | cohort = c)",
        mode: "apc",
        columns: ["cohort", "age", "period", "residual_after_age", "cohort_effect", "residual_after_cohort"],
        highlight: "cohort"
      },
      {
        id: "period",
        step: "10 · PERIOD",
        title: "Calendar time cuts diagonally across cohorts and ages",
        text: "Finally, illuminate cells sharing the same calendar month. In the vintage geometry they form a diagonal. PERIOD explains the common movement left after AGE and COHORT.",
        formula: "PERIODₚ = weighted mean(residual after COHORT | period = p)",
        mode: "apc",
        columns: ["cohort", "age", "period", "residual_after_cohort", "period_effect", "residual_after_period"],
        highlight: "period"
      },
      {
        id: "rebuild",
        step: "11 · Close the loop",
        title: "The columns now rebuild the cell risk",
        text: "On the logit scale the pieces add. Moving back through the inverse logit returns the decomposition to RD3M units, ready to aggregate again by portfolio period.",
        formula: "y = μ + AGE + COHORT + PERIOD + residual   →   RD3M",
        mode: "apc",
        columns: ["cohort", "age", "period", "rd3m", "risk_base", "contribution_age", "contribution_cohort", "contribution_period", "contribution_residual"]
      }
    ];

    let active = 0;
    root.innerHTML = `
      <div class="story-shell">
        <header class="story-header">
          <a href="https://jkunst.com">jkunst.com</a>
          <span>Three-month credit risk · Estonia</span>
        </header>
        <section class="story-copy">
          <p class="story-step"></p>
          <h1></h1>
          <p class="story-text"></p>
          <div class="story-formula"></div>
        </section>
        <section class="story-graphic" aria-live="polite"></section>
        <footer class="story-nav">
          <button class="prev" aria-label="Previous scene">←</button>
          <div class="dots"></div>
          <span class="counter"></span>
          <button class="next" aria-label="Next scene">→</button>
        </footer>
      </div>`;

    const ui = {
      step: root.querySelector(".story-step"),
      title: root.querySelector("h1"),
      text: root.querySelector(".story-text"),
      formula: root.querySelector(".story-formula"),
      graphic: root.querySelector(".story-graphic"),
      dots: root.querySelector(".dots"),
      counter: root.querySelector(".counter"),
      prev: root.querySelector(".prev"),
      next: root.querySelector(".next")
    };

    scenes.forEach((scene, index) => {
      const button = document.createElement("button");
      button.setAttribute("aria-label", `Scene ${index + 1}: ${scene.title}`);
      button.addEventListener("click", () => render(index));
      ui.dots.appendChild(button);
    });

    ui.prev.addEventListener("click", () => render(Math.max(0, active - 1)));
    ui.next.addEventListener("click", () => render(Math.min(scenes.length - 1, active + 1)));
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") render(Math.min(scenes.length - 1, active + 1));
      if (event.key === "ArrowLeft") render(Math.max(0, active - 1));
    });

    function render(index) {
      active = index;
      const scene = scenes[index];
      ui.step.textContent = scene.step;
      ui.title.textContent = scene.title;
      ui.text.textContent = scene.text;
      ui.formula.textContent = scene.formula;
      ui.counter.textContent = `${index + 1} / ${scenes.length}`;
      [...ui.dots.children].forEach((dot, i) => dot.classList.toggle("active", i === index));
      ui.prev.disabled = index === 0;
      ui.next.disabled = index === scenes.length - 1;

      if (scene.mode === "portfolio") renderPortfolio(false);
      if (scene.mode === "focus") renderPortfolio(true);
      if (scene.mode === "loans") renderLoans();
      if (scene.mode === "cells") renderFocalCells();
      if (scene.mode === "matrix") renderMatrix();
      if (scene.mode === "apc") renderApc(scene);
    }

    function renderPortfolio(focus) {
      const width = 960, height = 520;
      const margin = {top: 32, right: 28, bottom: 58, left: 72};
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const values = portfolio.map((row) => Number(row.observed_rd3m));
      const maxY = Math.max(...values) * 1.12;
      const x = (i) => margin.left + i * w / (portfolio.length - 1);
      const y = (v) => margin.top + h - v / maxY * h;
      const focalIndex = portfolio.findIndex((row) => row.period === focalPeriod);

      const svg = svgNode("svg", {viewBox: `0 0 ${width} ${height}`, class: "risk-line"});
      const axisY = svgNode("line", {x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + h, class: "axis"});
      const axisX = svgNode("line", {x1: margin.left, x2: width - margin.right, y1: margin.top + h, y2: margin.top + h, class: "axis"});
      svg.append(axisY, axisX);

      [0, .25, .5, .75, 1].forEach((fraction) => {
        const value = maxY * fraction;
        const yy = y(value);
        svg.appendChild(svgNode("line", {x1: margin.left, x2: width - margin.right, y1: yy, y2: yy, class: "grid"}));
        const label = svgNode("text", {x: margin.left - 10, y: yy + 4, class: "tick-label", "text-anchor": "end"});
        label.textContent = `${(100 * value).toFixed(1)}%`;
        svg.appendChild(label);
      });

      const path = portfolio.map((row, i) => `${i ? "L" : "M"}${x(i)},${y(Number(row.observed_rd3m))}`).join(" ");
      svg.appendChild(svgNode("path", {d: path, class: focus ? "portfolio-line muted" : "portfolio-line"}));

      portfolio.forEach((row, i) => {
        const isFocus = i === focalIndex;
        const circle = svgNode("circle", {
          cx: x(i), cy: y(Number(row.observed_rd3m)), r: isFocus && focus ? 7 : 2.6,
          class: isFocus && focus ? "portfolio-point focus" : "portfolio-point"
        });
        svg.appendChild(circle);
      });

      [0, Math.floor(portfolio.length / 4), Math.floor(portfolio.length / 2), Math.floor(3 * portfolio.length / 4), portfolio.length - 1]
        .forEach((i) => {
          const label = svgNode("text", {x: x(i), y: height - 20, class: "tick-label", "text-anchor": "middle"});
          label.textContent = monthLabel(portfolio[i].period, true);
          svg.appendChild(label);
        });

      const yTitle = svgNode("text", {x: 18, y: margin.top + h / 2, class: "axis-title", transform: `rotate(-90 18 ${margin.top + h / 2})`, "text-anchor": "middle"});
      yTitle.textContent = "Portfolio RD3M";
      svg.appendChild(yTitle);

      if (focus && focalIndex >= 0) {
        const row = portfolio[focalIndex];
        const xx = x(focalIndex), yy = y(Number(row.observed_rd3m));
        svg.appendChild(svgNode("line", {x1: xx, x2: xx, y1: yy + 11, y2: margin.top + h, class: "focus-guide"}));
        const value = svgNode("text", {x: xx + 14, y: yy - 13, class: "focus-value"});
        value.textContent = `${monthLabel(row.period)} · ${(100 * Number(row.observed_rd3m)).toFixed(2)}%`;
        svg.appendChild(value);
      }

      ui.graphic.replaceChildren(svg);
    }

    function renderLoans() {
      const wrap = document.createElement("div");
      wrap.className = "loan-stage";
      const summary = document.createElement("div");
      summary.className = "focal-summary";
      const row = focal.portfolio[0];
      summary.innerHTML = `<strong>${monthLabel(focal.period)}</strong><span>${Number(row.loans_at_risk).toLocaleString("en")} loans at risk</span><span>${Number(row.defaults_3m).toLocaleString("en")} defaults in the next 3 months</span><b>${(100 * Number(row.observed_rd3m)).toFixed(2)}% RD3M</b>`;
      wrap.appendChild(summary);

      const cards = document.createElement("div");
      cards.className = "loan-cards";
      focal.loans.forEach((loan) => {
        const card = document.createElement("article");
        card.className = `loan-card ${loan.default_3m ? "default" : "survive"}`;
        card.innerHTML = `<span class="loan-id">${String(loan.loan_id).slice(0, 8)}…</span><strong>${monthLabel(loan.cohort)}</strong><span>age ${loan.age}</span><span>${monthLabel(loan.period)} → ${monthLabel(loan.window_end_period)}</span><b>${loan.default_3m ? "default" : "no default"}</b>`;
        cards.appendChild(card);
      });
      wrap.appendChild(cards);
      ui.graphic.replaceChildren(wrap);
    }

    function renderFocalCells() {
      const wrap = document.createElement("div");
      wrap.className = "cell-stage";
      const cells = document.createElement("div");
      cells.className = "risk-cells";
      focal.cells.forEach((row) => {
        const card = document.createElement("article");
        card.className = "risk-cell";
        card.innerHTML = `<span>${monthLabel(row.cohort)}</span><strong>age ${row.age}</strong><em>${Number(row.loans_at_risk).toLocaleString("en")} loans</em><b>${(100 * Number(row.rd3m)).toFixed(2)}%</b>`;
        cells.appendChild(card);
      });
      const equation = document.createElement("div");
      equation.className = "weighted-equation";
      equation.innerHTML = `<span>cell RD3M × loans at risk</span><strong>→</strong><b>${monthLabel(focal.period)} portfolio RD3M</b>`;
      wrap.append(cells, equation);
      ui.graphic.replaceChildren(wrap);
    }

    function renderMatrix() {
      const cohorts = [...new Set(storyRows.map((row) => row.cohort))].sort();
      const ages = [...new Set(storyRows.map((row) => Number(row.age)))].sort((a, b) => a - b);
      const map = new Map(storyRows.map((row) => [`${row.cohort}|${row.age}`, row]));
      const table = document.createElement("table");
      table.className = "vintage-matrix";
      table.innerHTML = `<thead><tr><th>Cohort</th>${ages.map((age) => `<th>M${age}</th>`).join("")}</tr></thead>`;
      const body = document.createElement("tbody");
      cohorts.forEach((cohort) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<th>${monthLabel(cohort)}</th>`;
        ages.forEach((age) => {
          const row = map.get(`${cohort}|${age}`);
          const td = document.createElement("td");
          if (row) {
            td.className = "matrix-cell";
            td.dataset.period = row.period;
            td.innerHTML = `<b>${(100 * Number(row.rd3m)).toFixed(2)}%</b><span>${monthLabel(row.period, false, true)}</span>`;
          } else {
            td.className = "matrix-empty";
          }
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      table.appendChild(body);
      const legend = document.createElement("div");
      legend.className = "matrix-periods";
      data.story.periods.forEach((period, index) => {
        legend.innerHTML += `<span style="--period-index:${index}"><i></i>${monthLabel(period)}</span>`;
      });
      const wrap = document.createElement("div");
      wrap.className = "matrix-stage";
      wrap.append(table, legend);
      [...wrap.querySelectorAll("[data-period]")].forEach((cell) => {
        const index = data.story.periods.indexOf(cell.dataset.period);
        cell.style.setProperty("--period-index", Math.max(0, index));
      });
      ui.graphic.replaceChildren(wrap);
    }

    function renderApc(scene) {
      const table = document.createElement("table");
      table.className = "apc-table progressive";
      const labels = {
        cohort: "Cohort", age: "Age", period: "Period", loans_at_risk: "At risk", defaults_3m: "Defaults", rd3m: "RD3M",
        q: "Adjusted q", y_logit: "logit(q)", mu: "μ", residual_after_mean: "Residual after μ", age_effect: "AGE", residual_after_age: "Residual after AGE",
        cohort_effect: "COHORT", residual_after_cohort: "Residual after COHORT", period_effect: "PERIOD", residual_after_period: "Final residual",
        risk_base: "Base", contribution_age: "AGE", contribution_cohort: "COHORT", contribution_period: "PERIOD", contribution_residual: "Residual"
      };
      table.innerHTML = `<thead><tr>${scene.columns.map((key) => `<th>${labels[key]}</th>`).join("")}</tr></thead>`;
      const body = document.createElement("tbody");
      storyRows.forEach((row) => {
        const tr = document.createElement("tr");
        if (scene.highlight && scene.highlight !== "all") tr.dataset.group = String(row[scene.highlight]);
        scene.columns.forEach((key) => {
          const td = document.createElement("td");
          td.className = `col-${key}`;
          td.textContent = formatCell(key, row);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      table.appendChild(body);

      const wrap = document.createElement("div");
      wrap.className = `apc-stage highlight-${scene.highlight || "none"}`;
      wrap.appendChild(table);

      if (scene.highlight === "all") {
        const badge = document.createElement("div");
        badge.className = "calculation-badge";
        badge.innerHTML = `<span>weighted across all visible cells</span><strong>μ = ${Number(data.story.mean.mu).toFixed(3)}</strong>`;
        wrap.prepend(badge);
      }
      if (scene.highlight && scene.highlight !== "all") {
        const unique = [...new Set(storyRows.map((row) => String(row[scene.highlight])))];
        [...body.children].forEach((tr) => {
          tr.style.setProperty("--group-index", unique.indexOf(tr.dataset.group) % 5);
        });
      }
      ui.graphic.replaceChildren(wrap);
    }

    function formatCell(key, row) {
      if (["cohort", "period"].includes(key)) return monthLabel(row[key]);
      if (["age", "loans_at_risk", "defaults_3m"].includes(key)) return Number(row[key]).toLocaleString("en");
      const value = Number(row[key]);
      if (!Number.isFinite(value)) return "—";
      if (["rd3m", "q", "risk_base", "contribution_age", "contribution_cohort", "contribution_period", "contribution_residual"].includes(key)) {
        return `${(100 * value).toFixed(Math.abs(value) < 0.001 ? 3 : 2)}%`;
      }
      return value.toFixed(3);
    }

    render(0);
  }

  function monthLabel(value, yearOnly = false, monthOnly = false) {
    const date = new Date(`${value}T00:00:00`);
    if (yearOnly) return String(date.getFullYear());
    if (monthOnly) return date.toLocaleDateString("en", {month: "short"});
    return date.toLocaleDateString("en", {month: "short", year: "numeric"});
  }

  function svgNode(tag, attrs = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
})();
</script>
