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
    .then(start)
    .catch((error) => {
      root.innerHTML = `<p class="story-error">Could not load the story: ${error.message}</p>`;
    });

  function start(data) {
    const rows = data.example.rows;
    const portfolio = data.portfolio;
    const scenes = [
      {id: "rd3m", step: "1 · Measure risk", title: "Start with a three-month window", text: "Each row is one cohort at one loan age. RD3M asks how many loans alive at the start of that age default during the next three months.", formula: "RD3M = defaults over the next 3 months / loans at risk", columns: ["cohort", "age", "period", "window", "loans", "defaults", "rd3m"]},
      {id: "logit", step: "2 · Change scale", title: "Turn a probability into an additive quantity", text: "A small add-half correction keeps zero-default cells finite. The logit then moves the bounded probability onto the real line, where additive effects are natural.", formula: "q = (defaults + 0.5) / (loans + 1)   →   y = log(q / (1 − q))", columns: ["cohort", "age", "loans", "rd3m", "q", "y_logit"]},
      {id: "mean", step: "3 · Start from one level", title: "Every cell begins from the same baseline", text: "Weight the logit values by the number of loans at risk. The result is one global level μ. What remains in each row becomes the first residual.", formula: "μ = Σ(nᵢ yᵢ) / Σnᵢ   →   residual = y − μ", columns: ["cohort", "age", "loans", "y_logit", "mu", "residual_after_mean"]},
      {id: "age", step: "4 · AGE", title: "Explain what changes with loan age", text: "Rows sharing the same age are pooled. Their weighted residual becomes the AGE effect, then we subtract it and carry the unexplained part forward.", formula: "AGEₐ = weighted mean(y − μ | age = a)", columns: ["cohort", "age", "residual_after_mean", "age_effect", "residual_after_age"], group: "age"},
      {id: "cohort", step: "5 · COHORT", title: "Now explain differences between originations", text: "COHORT works on what AGE left behind. Loans originated in the same month receive the same cohort contribution.", formula: "COHORT꜀ = weighted mean(residual after AGE | cohort = c)", columns: ["cohort", "age", "residual_after_age", "cohort_effect", "residual_after_cohort"], group: "cohort"},
      {id: "period", step: "6 · PERIOD", title: "Calendar time cuts diagonally across the vintages", text: "Different cohorts reach the same calendar period at different ages. PERIOD explains the common movement left after AGE and COHORT.", formula: "PERIODₚ = weighted mean(residual after COHORT | period = p)", columns: ["cohort", "age", "period", "residual_after_cohort", "period_effect", "residual_after_period"], group: "period"},
      {id: "rebuild", step: "7 · Rebuild", title: "Put the pieces back together", text: "On the logit scale the identity is additive. Applying the inverse logit returns us to default-risk units. The final display residual closes the gap to the raw RD3M.", formula: "y = μ + AGE + COHORT + PERIOD + residual   →   RD3M", columns: ["cohort", "age", "rd3m", "risk_base", "contribution_age", "contribution_cohort", "contribution_period", "contribution_residual"]},
      {id: "portfolio", step: "8 · Scale up", title: "What drives three-month portfolio risk?", text: "The same calculation is run on the full vintage table. Within each calendar month, cell contributions are weighted by loans at risk. The components add back to observed portfolio RD3M.", formula: "RD3Mₚ = Base + AGE + COHORT + PERIOD + Residual", chart: true}
    ];

    let active = 0;
    root.innerHTML = `
      <div class="story-shell">
        <header class="story-header"><a href="https://jkunst.com">jkunst.com</a><span>Credit risk · APC</span></header>
        <section class="story-copy"><p class="story-step"></p><h1></h1><p class="story-text"></p><div class="story-formula"></div></section>
        <section class="story-graphic"><div class="table-wrap"></div><div class="chart-wrap"></div></section>
        <footer class="story-nav"><button class="prev" aria-label="Previous scene">←</button><div class="dots"></div><span class="counter"></span><button class="next" aria-label="Next scene">→</button></footer>
      </div>`;

    const ui = {
      step: root.querySelector(".story-step"), title: root.querySelector("h1"), text: root.querySelector(".story-text"), formula: root.querySelector(".story-formula"), table: root.querySelector(".table-wrap"), chart: root.querySelector(".chart-wrap"), dots: root.querySelector(".dots"), counter: root.querySelector(".counter"), prev: root.querySelector(".prev"), next: root.querySelector(".next")
    };
    scenes.forEach((scene, i) => {
      const b = document.createElement("button"); b.setAttribute("aria-label", `Scene ${i + 1}: ${scene.title}`); b.onclick = () => render(i); ui.dots.appendChild(b);
    });
    ui.prev.onclick = () => render(Math.max(0, active - 1));
    ui.next.onclick = () => render(Math.min(scenes.length - 1, active + 1));
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") render(Math.min(scenes.length - 1, active + 1));
      if (event.key === "ArrowLeft") render(Math.max(0, active - 1));
    });

    function render(index) {
      active = index; const scene = scenes[index];
      ui.step.textContent = scene.step; ui.title.textContent = scene.title; ui.text.textContent = scene.text; ui.formula.textContent = scene.formula;
      ui.counter.textContent = `${index + 1} / ${scenes.length}`;
      [...ui.dots.children].forEach((dot, i) => dot.classList.toggle("active", i === index));
      ui.prev.disabled = index === 0; ui.next.disabled = index === scenes.length - 1;
      ui.table.hidden = !!scene.chart; ui.chart.hidden = !scene.chart;
      if (scene.chart) drawChart(); else drawTable(scene);
    }

    function drawTable(scene) {
      const labels = {cohort:"Cohort", age:"Age", period:"Period", window:"3M window", loans:"At risk", defaults:"Defaults", rd3m:"RD3M", q:"Adjusted q", y_logit:"logit(q)", mu:"μ", residual_after_mean:"Residual", age_effect:"AGE", residual_after_age:"After AGE", cohort_effect:"COHORT", residual_after_cohort:"After COHORT", period_effect:"PERIOD", residual_after_period:"Final residual", risk_base:"Base", contribution_age:"AGE", contribution_cohort:"COHORT", contribution_period:"PERIOD", contribution_residual:"Residual"};
      let html = `<table class="apc-table"><thead><tr>${scene.columns.map(c => `<th>${labels[c]}</th>`).join("")}</tr></thead><tbody>`;
      rows.forEach((row) => {
        const group = scene.group ? String(row[scene.group]) : "";
        html += `<tr data-group="${group}">${scene.columns.map(c => `<td class="col-${c}">${formatCell(c,row)}</td>`).join("")}</tr>`;
      });
      html += "</tbody></table>"; ui.table.innerHTML = html;
      if (scene.group) [...ui.table.querySelectorAll("tr[data-group]")].forEach((tr, i) => tr.style.setProperty("--group-index", groupIndex(scene.group, rows[i][scene.group])));
    }

    function groupIndex(key, value) { return [...new Set(rows.map(r => String(r[key])))].indexOf(String(value)) % 5; }
    function shortMonth(x) { return new Date(`${x}T00:00:00`).toLocaleDateString("en", {month:"short", year:"2-digit"}); }
    function formatCell(key,row) {
      if (key === "cohort" || key === "period") return shortMonth(row[key]);
      if (key === "window") return `${shortMonth(row.period)}–${shortMonth(row.window_end_period)}`;
      if (key === "age" || key === "loans" || key === "defaults") return Number(row[key === "loans" ? "loans_at_risk" : key === "defaults" ? "defaults_3m" : key]).toLocaleString("en");
      const value = Number(row[key]); if (!Number.isFinite(value)) return "—";
      if (["rd3m","q","risk_base","contribution_age","contribution_cohort","contribution_period","contribution_residual"].includes(key)) return `${(100*value).toFixed(Math.abs(value)<0.001 ? 3 : 2)}%`;
      return value.toFixed(3);
    }

    function drawChart() {
      if (ui.chart.dataset.drawn) return; ui.chart.dataset.drawn = "true";
      const width=1100,height=500,m={t:25,r:30,b:55,l:70}, innerW=width-m.l-m.r, innerH=height-m.t-m.b;
      const keys=["base","age_component","cohort_component","period_component","residual_component"], names=["Base","AGE","COHORT","PERIOD","Residual"];
      const colours=["#aab2bd","#69a7d8","#65b58b","#e6b65c","#df6f68"];
      const maxAbs=Math.max(...portfolio.flatMap(r=>keys.map(k=>Math.abs(Number(r[k])))), ...portfolio.map(r=>Math.abs(Number(r.observed_rd3m))));
      const yMax=maxAbs*1.3, x=i=>m.l+i*innerW/(portfolio.length-1), y=v=>m.t+innerH/2-(v/yMax)*(innerH/2-10), zero=y(0);
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox",`0 0 ${width} ${height}`); svg.setAttribute("role","img"); svg.setAttribute("aria-label","RD3M portfolio decomposition by calendar period");
      const add=(tag,attrs,parent=svg)=>{const n=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.appendChild(n);return n;};
      add("line",{x1:m.l,x2:width-m.r,y1:zero,y2:zero,class:"zero-line"});
      const barW=Math.max(2,innerW/portfolio.length*.68);
      portfolio.forEach((row,i)=>{let pos=0,neg=0;keys.forEach((key,j)=>{const v=Number(row[key]);const start=v>=0?pos:neg,end=start+v;add("rect",{x:x(i)-barW/2,y:Math.min(y(start),y(end)),width:barW,height:Math.max(1,Math.abs(y(end)-y(start))),fill:colours[j],opacity:.88});if(v>=0)pos=end;else neg=end;});});
      const path=portfolio.map((r,i)=>`${i?"L":"M"}${x(i)},${y(Number(r.observed_rd3m))}`).join(" "); add("path",{d:path,class:"observed-line"});
      [0,Math.floor((portfolio.length-1)/2),portfolio.length-1].forEach(i=>{const t=add("text",{x:x(i),y:height-18,class:"axis-label","text-anchor":"middle"});t.textContent=new Date(`${portfolio[i].period}T00:00:00`).getFullYear();});
      const legend=document.createElement("div");legend.className="chart-legend"; names.forEach((name,j)=>legend.innerHTML+=`<span><i style="background:${colours[j]}"></i>${name}</span>`);legend.innerHTML+=`<span><i class="line-key"></i>Observed RD3M</span>`;
      ui.chart.replaceChildren(svg,legend);
    }
    render(0);
  }
})();
</script>
