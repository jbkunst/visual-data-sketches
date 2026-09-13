<script>
(() => {
  "use strict";

  const root = document.querySelector("[data-rd3m-story]");
  if (!root) return;

  const sourceUrl = new URL(root.dataset.source, window.location.href);
  sourceUrl.searchParams.set("v", root.dataset.dataVersion || "3");

  fetch(sourceUrl, {cache: "no-store"})
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data?.portfolio) || !data?.focal || !Array.isArray(data?.story?.rows)) {
        throw new Error("Run Rscript rd3m-apc/prepare-data.R to regenerate the V3 story data.");
      }
      startStory(data);
    })
    .catch((error) => {
      root.innerHTML = `<p class="story-error">Could not load the story: ${error.message}</p>`;
    });

  function startStory(data) {
    const portfolio = data.portfolio;
    const focal = data.focal;
    const rows = data.story.rows;
    const focalPeriod = data.metadata.focal_period;

    const sheetSteps = [
      {id:"sheet", step:"5 · The base sheet", title:"Keep only the structure we need", text:"The individual loans collapse into cohort × age cells. From here on, this same sheet stays in place. We only add new columns to the right.", formula:"cell RD3M = defaults in next 3 months / loans at risk", columns:["cohort","age","rd3m"]},
      {id:"q", step:"6 · Adjust the rate", title:"Add a finite probability", text:"Some cells can have zero defaults. The add-half correction changes the rate only slightly but keeps the next transformation finite.", formula:"q = (defaults + 0.5) / (loans at risk + 1)", columns:["cohort","age","rd3m","q"], added:"q"},
      {id:"logit", step:"7 · Change scale", title:"Move RD3M to an additive scale", text:"The logit turns the bounded probability into a quantity that can be decomposed additively.", formula:"y = log(q / (1 − q))", columns:["cohort","age","rd3m","q","y_logit"], added:"y_logit"},
      {id:"mu", step:"8 · Baseline", title:"Calculate one weighted level", text:"All visible cells contribute to μ, weighted by loans at risk. The original three columns do not move; μ simply appears to their right.", formula:"μ = Σ(nᵢ yᵢ) / Σnᵢ", columns:["cohort","age","rd3m","q","y_logit","mu"], added:"mu", highlight:"all"},
      {id:"r0", step:"9 · First residual", title:"What is left after the baseline?", text:"The first residual is just the difference between each cell's logit and the common baseline.", formula:"residual₀ = y − μ", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean"], added:"residual_after_mean"},
      {id:"age", step:"10 · AGE", title:"Explain the first residual by age", text:"Cells with the same age light up together. Their loan-weighted residual becomes the AGE effect.", formula:"AGEₐ = weighted mean(residual₀ | age = a)", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean","age_effect"], added:"age_effect", highlight:"age"},
      {id:"r1", step:"11 · Residual after AGE", title:"Carry forward what AGE did not explain", text:"Subtract AGE from the previous residual. Nothing else changes in the sheet.", formula:"residual₁ = residual₀ − AGE", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age"], added:"residual_after_age"},
      {id:"cohort", step:"12 · COHORT", title:"Now group by origination cohort", text:"Cells from the same origination month light up. Their weighted residual becomes the COHORT effect.", formula:"COHORT꜀ = weighted mean(residual₁ | cohort = c)", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect"], added:"cohort_effect", highlight:"cohort"},
      {id:"r2", step:"13 · Residual after COHORT", title:"Carry forward what COHORT did not explain", text:"Subtract the cohort effect and keep the remainder for the final grouping.", formula:"residual₂ = residual₁ − COHORT", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort"], added:"residual_after_cohort"},
      {id:"period", step:"14 · PERIOD", title:"The last grouping is calendar time", text:"Equal periods form diagonals in the vintage geometry. Their weighted residual becomes PERIOD.", formula:"PERIODₚ = weighted mean(residual₂ | period = p)", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect"], added:"period_effect", highlight:"period"},
      {id:"r3", step:"15 · Final residual", title:"What remains is cell-specific", text:"After AGE, COHORT and PERIOD, the final residual is the part left unexplained for that cohort-age-period cell.", formula:"residual₃ = residual₂ − PERIOD", columns:["cohort","age","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect","residual_after_period"], added:"residual_after_period"}
    ];

    const scenes = [
      {id:"portfolio",step:"1 · Portfolio risk",title:"Measure risk over the next three months",text:"Portfolio risk can be measured at different forward horizons: RD1M, RD2M, RD3M, and so on. Here we use RD3M.",formula:"RD3Mₜ = defaults during t, t+1, t+2 / loans alive at t",mode:"line"},
      {id:"focus",step:"2 · One point",title:"Freeze the line at April 2020",text:"Pick one month in the middle of the series. The line fades and we keep only this portfolio RD3M value.",formula:`${monthLabel(focalPeriod)} · portfolio RD3M`,mode:"focus"},
      {id:"ratio",step:"3 · Numerator and denominator",title:"Where does this percentage come from?",text:"The denominator is every observable loan alive in April 2020. Move those loans forward three months: the defaults become the numerator.",formula:"RD3M = defaults in the next 3 months / loans alive today",mode:"ratio"},
      {id:"mix",step:"4 · The mixture inside",title:"Those loans are not all alike",text:"Each point is a loan. In the same calendar month, loans have different ages and belong to different origination cohorts. Grouping them gives the cohort × age cells used by the decomposition.",formula:"same period · different cohort · different age",mode:"mix"},
      ...sheetSteps
    ];

    let active = 0;
    root.innerHTML = `
      <div class="story-shell">
        <header class="story-header"><a href="https://jkunst.com">jkunst.com</a><span>RD3M · Estonia</span></header>
        <section class="story-copy"><p class="story-step"></p><h1></h1><p class="story-text"></p><div class="story-formula"></div></section>
        <section class="story-graphic" aria-live="polite"></section>
        <footer class="story-nav"><button class="prev">←</button><div class="dots"></div><span class="counter"></span><button class="next">→</button></footer>
      </div>`;

    const ui = {
      step: root.querySelector(".story-step"), title: root.querySelector("h1"), text: root.querySelector(".story-text"), formula: root.querySelector(".story-formula"), graphic: root.querySelector(".story-graphic"), dots: root.querySelector(".dots"), counter: root.querySelector(".counter"), prev: root.querySelector(".prev"), next: root.querySelector(".next")
    };

    scenes.forEach((scene, i) => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", `Scene ${i + 1}: ${scene.title}`);
      b.onclick = () => render(i);
      ui.dots.appendChild(b);
    });
    ui.prev.onclick = () => render(Math.max(0, active - 1));
    ui.next.onclick = () => render(Math.min(scenes.length - 1, active + 1));
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") render(Math.min(scenes.length - 1, active + 1));
      if (event.key === "ArrowLeft") render(Math.max(0, active - 1));
    });

    function render(index) {
      active = index;
      const scene = scenes[index];
      ui.step.textContent = scene.step; ui.title.textContent = scene.title; ui.text.textContent = scene.text; ui.formula.textContent = scene.formula;
      ui.counter.textContent = `${index + 1} / ${scenes.length}`;
      [...ui.dots.children].forEach((d,i)=>d.classList.toggle("active",i===index));
      ui.prev.disabled = index === 0; ui.next.disabled = index === scenes.length - 1;
      if (scene.mode === "line") renderLine(false);
      else if (scene.mode === "focus") renderLine(true);
      else if (scene.mode === "ratio") renderRatio();
      else if (scene.mode === "mix") renderMix();
      else renderSheet(scene);
    }

    function renderLine(focus) {
      const width=980,height=470,m={t:28,r:28,b:62,l:68},w=width-m.l-m.r,h=height-m.t-m.b;
      const values=portfolio.map(r=>Number(r.observed_rd3m));
      const maxY=Math.max(...values)*1.12;
      const x=i=>m.l+i*w/(portfolio.length-1), y=v=>m.t+h-v/maxY*h;
      const focalIndex=portfolio.findIndex(r=>r.period===focalPeriod);
      const svg=svgNode("svg",{viewBox:`0 0 ${width} ${height}`,class:"risk-line"});
      [0,.25,.5,.75,1].forEach(frac=>{
        const yy=y(maxY*frac); svg.appendChild(svgNode("line",{x1:m.l,x2:width-m.r,y1:yy,y2:yy,class:"grid"}));
        const t=svgNode("text",{x:m.l-10,y:yy+4,class:"tick-label","text-anchor":"end"});t.textContent=`${(100*maxY*frac).toFixed(1)}%`;svg.appendChild(t);
      });
      const path=portfolio.map((r,i)=>`${i?"L":"M"}${x(i)},${y(Number(r.observed_rd3m))}`).join(" ");
      const line=svgNode("path",{d:path,class:focus?"portfolio-line muted":"portfolio-line animated-line"});svg.appendChild(line);
      [0,Math.floor(portfolio.length/4),Math.floor(portfolio.length/2),Math.floor(3*portfolio.length/4),portfolio.length-1].forEach(i=>{
        const t=svgNode("text",{x:x(i),y:height-22,class:"tick-label","text-anchor":"middle"});t.textContent=monthLabel(portfolio[i].period,true);svg.appendChild(t);
      });
      const yt=svgNode("text",{x:18,y:m.t+h/2,class:"axis-title",transform:`rotate(-90 18 ${m.t+h/2})`,"text-anchor":"middle"});yt.textContent="Portfolio RD3M";svg.appendChild(yt);
      if (focus && focalIndex>=0) {
        const row=portfolio[focalIndex],xx=x(focalIndex),yy=y(Number(row.observed_rd3m));
        const guide=svgNode("line",{x1:xx,x2:xx,y1:m.t+h,y2:yy,class:"focus-guide animated-guide"});svg.appendChild(guide);
        const c=svgNode("circle",{cx:xx,cy:yy,r:7,class:"focus-dot pop"});svg.appendChild(c);
        const t=svgNode("text",{x:xx+14,y:yy-13,class:"focus-value pop"});t.textContent=`${monthLabel(row.period)} · ${(100*Number(row.observed_rd3m)).toFixed(2)}%`;svg.appendChild(t);
      }
      ui.graphic.replaceChildren(svg);
    }

    function renderRatio() {
      const row=focal.portfolio[0];
      const total=Number(row.loans_at_risk), defaults=Number(row.defaults_3m), rate=Number(row.observed_rd3m);
      const maxDots=520, shown=Math.min(maxDots,total), red=Math.max(1,Math.round(shown*defaults/total));
      const scale=total/shown;
      const wrap=document.createElement("div");wrap.className="ratio-stage";
      wrap.innerHTML=`<div class="ratio-number"><strong>${(100*rate).toFixed(2)}%</strong><span>= ${defaults.toLocaleString("en")} / ${total.toLocaleString("en")}</span></div>`;
      const clouds=document.createElement("div");clouds.className="dot-clouds";
      clouds.append(makeCloud(shown,0,"Loans alive in Apr 2020"),makeArrow(),makeCloud(shown,red,"After 3 months"));
      wrap.appendChild(clouds);
      const note=document.createElement("p");note.className="dot-note";note.textContent=scale>1.05?`1 dot ≈ ${Math.round(scale).toLocaleString("en")} loans; red dots preserve the exact RD3M proportion.`:"Each dot is one loan.";wrap.appendChild(note);
      ui.graphic.replaceChildren(wrap);
    }

    function makeCloud(count, redCount, label) {
      const box=document.createElement("div");box.className="cloud-block";
      const lab=document.createElement("strong");lab.textContent=label;box.appendChild(lab);
      const cloud=document.createElement("div");cloud.className="dot-cloud";
      for(let i=0;i<count;i++){const d=document.createElement("i");d.className=i<redCount?"loan-dot default":"loan-dot";d.style.animationDelay=`${Math.min(i,90)*5}ms`;cloud.appendChild(d);} box.appendChild(cloud);return box;
    }
    function makeArrow(){const a=document.createElement("div");a.className="cloud-arrow";a.textContent="→";return a;}

    function renderMix() {
      const wrap=document.createElement("div");wrap.className="mix-stage";
      const ages=[...new Set(focal.cells.map(r=>Number(r.age)))];
      focal.cells.forEach((cell,i)=>{
        const g=document.createElement("div");g.className="mix-group";
        g.innerHTML=`<span>${monthLabel(cell.cohort)}</span><strong>age ${cell.age}</strong><b>${(100*Number(cell.rd3m)).toFixed(2)}%</b>`;
        const dots=document.createElement("div");dots.className="mini-cloud";
        const n=Math.min(64,Math.max(12,Math.round(Number(cell.loans_at_risk)/Math.max(...focal.cells.map(r=>Number(r.loans_at_risk)))*64)));
        for(let j=0;j<n;j++){const d=document.createElement("i");d.className="loan-dot";dots.appendChild(d);}g.appendChild(dots);g.style.animationDelay=`${i*70}ms`;wrap.appendChild(g);
      });
      ui.graphic.replaceChildren(wrap);
    }

    function renderSheet(scene) {
      const stage=document.createElement("div");stage.className="sheet-stage";
      const table=document.createElement("div");table.className="sheet-grid";
      table.style.setProperty("--cols",scene.columns.length);
      scene.columns.forEach((key)=>{const h=document.createElement("div");h.className=`sheet-cell head col-${key}${key===scene.added?" added":""}`;h.textContent=labelFor(key);table.appendChild(h);});
      rows.forEach((row,rowIndex)=>{
        scene.columns.forEach((key)=>{const c=document.createElement("div");c.className=`sheet-cell col-${key}${key===scene.added?" added":""}`;c.textContent=formatCell(key,row);
          if(scene.highlight==="all") c.classList.add("lit");
          else if(scene.highlight && String(row[scene.highlight])===String(rows[0][scene.highlight])) c.classList.add("lit");
          c.style.animationDelay=`${rowIndex*18}ms`;table.appendChild(c);});
      });
      stage.appendChild(table); ui.graphic.replaceChildren(stage);
      if(scene.added){requestAnimationFrame(()=>stage.querySelectorAll(".added").forEach(el=>el.classList.add("reveal")));}
    }

    function labelFor(key){return {cohort:"Cohort",age:"Age",rd3m:"RD3M",q:"q",y_logit:"logit(q)",mu:"μ",residual_after_mean:"Residual 0",age_effect:"AGE",residual_after_age:"Residual 1",cohort_effect:"COHORT",residual_after_cohort:"Residual 2",period_effect:"PERIOD",residual_after_period:"Residual 3"}[key]||key;}
    function formatCell(key,row){if(key==="cohort")return monthLabel(row.cohort);if(key==="age")return row.age;const v=Number(row[key]);if(!Number.isFinite(v))return"—";if(key==="rd3m"||key==="q")return`${(100*v).toFixed(2)}%`;return v.toFixed(3);}
    function monthLabel(value,yearOnly=false){const d=new Date(`${value}T00:00:00`);return yearOnly?String(d.getFullYear()):d.toLocaleDateString("en",{month:"short",year:"numeric"});}
    function svgNode(tag,attrs={}){const n=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;}

    render(0);
  }
})();
</script>
