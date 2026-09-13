<script>
(() => {
  "use strict";

  const root = document.querySelector("[data-rd3m-story]");
  if (!root) return;

  const sourceUrl = new URL(root.dataset.source, window.location.href);
  sourceUrl.searchParams.set("v", root.dataset.dataVersion || "4");

  fetch(sourceUrl, {cache: "no-store"})
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    })
    .then((data) => {
      validate(data);
      start(data);
    })
    .catch((error) => {
      root.innerHTML = `<p class="story-error">Could not load the story: ${error.message}</p>`;
    });

  function validate(data) {
    if (!Array.isArray(data?.portfolio)) throw new Error("Missing portfolio data");
    if (!Array.isArray(data?.focal?.cells)) throw new Error("Missing focal cells");
    if (!Array.isArray(data?.story?.rows)) throw new Error("Missing story rows. Re-run prepare-data.R");
  }

  function start(data) {
    const portfolio = data.portfolio;
    const focal = data.focal;
    const rows = data.story.rows;
    const focalPeriod = data.metadata.focal_period;
    let active = 0;
    let runToken = 0;

    const scenes = [
      {id:"portfolio", kicker:"1 · Portfolio risk", title:"Risk depends on the horizon", text:"A portfolio can be measured with RD1M, RD2M, RD3M, or another forward horizon. Here we use RD3M: among loans alive today, how many default during the next three months?", formula:"\\[RD3M_t=\\frac{D_{t:t+2}}{N_t}\\]", mode:"line"},
      {id:"focus", kicker:"2 · One period", title:"Pick one point in time", text:`Now focus on ${monthLabel(focalPeriod)}. The portfolio RD3M at this point is one number, but that number is built from many loans.`, formula:"\\[RD3M_{Apr\,2020}=1.64\\%\\]", mode:"focus"},
      {id:"ratio", kicker:"3 · Numerator and denominator", title:"What does 1.64% actually mean?", text:"The denominator is every loan at risk at the start of the month. Three months later, the numerator is the subset that defaulted. The red marks are not a sample: they represent the default count in the numerator.", formula:"", mode:"dots"},
      {id:"ages", kicker:"4 · Inside the denominator", title:"Those loans are not all alike", text:"Each point is one loan. Keep the same population and sweep through age groups: age 1, then age 2, and so on. The highlighted group changes, while the portfolio point stays the same.", formula:"\\[period=cohort+age\\]", mode:"ageDots"},
      {id:"base", kicker:"5 · Aggregate the loans", title:"Collapse the points into cohort × age cells", text:"Each highlighted group becomes one row. Now the base sheet has cohort, age, loans at risk, defaults in the next three months, and the cell RD3M. This sheet stays fixed from here on.", formula:"\\[RD3M_{c,a}=\\frac{D^{3M}_{c,a}}{N_{c,a}}\\]", mode:"sheet", step:"base"},
      {id:"q", kicker:"6 · Adjust zero cells", title:"Add the adjusted probability", text:"A small add-half correction keeps zero-default cells finite. Only one new column appears on the right.", formula:"\\[q_i=\\frac{D_i+0.5}{N_i+1}\\]", mode:"sheet", step:"q", deps:["defaults_3m","loans_at_risk"]},
      {id:"logit", kicker:"7 · Change scale", title:"Move to log-odds", text:"RD3M is bounded between zero and one. The logit moves the adjusted probability onto an additive scale.", formula:"\\[y_i=\\operatorname{logit}(q_i)=\\log\\!\\left(\\frac{q_i}{1-q_i}\\right)\\]", mode:"sheet", step:"logit", deps:["q"]},
      {id:"mu", kicker:"8 · Global baseline", title:"Start from one weighted level", text:"All visible logit values contribute to the baseline, weighted by loans at risk. Everything else fades while the inputs to μ stay visible.", formula:"\\[\\mu=\\frac{\\sum_i N_i y_i}{\\sum_i N_i}\\]", mode:"sheet", step:"mu", deps:["loans_at_risk","y_logit"]},
      {id:"r0", kicker:"9 · First residual", title:"What is left after the baseline?", text:"For each row, subtract μ from logit(q). Keep logit(q) and μ bright; the rest of the sheet recedes. The new residual column fills from top to bottom.", formula:"\\[r_i^{(0)}=y_i-\\mu\\]", mode:"sheet", step:"r0", deps:["y_logit","mu"]},
      {id:"age", kicker:"10 · AGE", title:"Fill AGE one group at a time", text:"AGE uses the first residual and loans at risk. The animation cycles through age 1, age 2, …, highlighting only the rows used in each weighted mean before writing the corresponding AGE value.", formula:"\\[A_a=\\frac{\\sum_{i:age_i=a}N_i r_i^{(0)}}{\\sum_{i:age_i=a}N_i}\\]", mode:"sheet", step:"age", deps:["age","loans_at_risk","residual_after_mean"], cycle:"age"},
      {id:"r1", kicker:"11 · Residual after AGE", title:"Subtract the AGE contribution", text:"Now only residual₀ and AGE remain prominent. Their difference creates the next residual column.", formula:"\\[r_i^{(1)}=r_i^{(0)}-A_{age_i}\\]", mode:"sheet", step:"r1", deps:["residual_after_mean","age_effect"]},
      {id:"cohort", kicker:"12 · COHORT", title:"Fill COHORT one origination month at a time", text:"COHORT works on what AGE left behind. Rows from the same origination cohort light up together, then the column fills for that group.", formula:"\\[C_c=\\frac{\\sum_{i:cohort_i=c}N_i r_i^{(1)}}{\\sum_{i:cohort_i=c}N_i}\\]", mode:"sheet", step:"cohort", deps:["cohort","loans_at_risk","residual_after_age"], cycle:"cohort"},
      {id:"r2", kicker:"13 · Residual after COHORT", title:"Subtract the COHORT contribution", text:"The next residual is what remains after both AGE and COHORT have been removed.", formula:"\\[r_i^{(2)}=r_i^{(1)}-C_{cohort_i}\\]", mode:"sheet", step:"r2", deps:["residual_after_age","cohort_effect"]},
      {id:"period", kicker:"14 · PERIOD", title:"Finish with calendar time", text:"Rows sharing the same period now light up together. In cohort-age geometry they form diagonals. PERIOD explains the common movement left after AGE and COHORT.", formula:"\\[P_p=\\frac{\\sum_{i:period_i=p}N_i r_i^{(2)}}{\\sum_{i:period_i=p}N_i}\\]", mode:"sheet", step:"period", deps:["period","loans_at_risk","residual_after_cohort"], cycle:"period"},
      {id:"r3", kicker:"15 · Final residual", title:"What remains is cell-level residual", text:"Subtract PERIOD and the sequential decomposition is complete. Every new column came from columns already visible to its left.", formula:"\\[r_i^{(3)}=r_i^{(2)}-P_{period_i}\\]", mode:"sheet", step:"r3", deps:["residual_after_cohort","period_effect"]}
    ];

    root.innerHTML = `
      <div class="story-shell">
        <header class="story-header"><a href="https://jkunst.com">jkunst.com</a><span>Three-month credit risk · Estonia</span></header>
        <section class="story-copy"><p class="story-step"></p><h1></h1><p class="story-text"></p><div class="story-formula"></div></section>
        <section class="story-graphic" aria-live="polite"></section>
        <footer class="story-nav"><button class="prev" aria-label="Previous">←</button><div class="dots"></div><span class="counter"></span><button class="next" aria-label="Next">→</button></footer>
      </div>`;

    const ui = {
      step: root.querySelector(".story-step"), title: root.querySelector("h1"), text: root.querySelector(".story-text"), formula: root.querySelector(".story-formula"), graphic: root.querySelector(".story-graphic"), dots: root.querySelector(".dots"), counter: root.querySelector(".counter"), prev: root.querySelector(".prev"), next: root.querySelector(".next")
    };

    scenes.forEach((scene, i) => {
      const button = document.createElement("button");
      button.setAttribute("aria-label", `Scene ${i + 1}: ${scene.title}`);
      button.onclick = () => render(i);
      ui.dots.appendChild(button);
    });
    ui.prev.onclick = () => render(Math.max(0, active - 1));
    ui.next.onclick = () => render(Math.min(scenes.length - 1, active + 1));
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") render(Math.min(scenes.length - 1, active + 1));
      if (event.key === "ArrowLeft") render(Math.max(0, active - 1));
    });

    function render(index) {
      active = index;
      runToken += 1;
      const token = runToken;
      const scene = scenes[index];
      ui.step.textContent = scene.kicker;
      ui.title.textContent = scene.title;
      ui.text.textContent = scene.text;
      ui.formula.innerHTML = scene.formula || "";
      typeset(ui.formula);
      ui.counter.textContent = `${index + 1} / ${scenes.length}`;
      [...ui.dots.children].forEach((dot, i) => dot.classList.toggle("active", i === index));
      ui.prev.disabled = index === 0;
      ui.next.disabled = index === scenes.length - 1;

      if (scene.mode === "line") renderLine(false, token);
      if (scene.mode === "focus") renderLine(true, token);
      if (scene.mode === "dots") renderDots(token, false);
      if (scene.mode === "ageDots") renderDots(token, true);
      if (scene.mode === "sheet") renderSheet(scene, token);
    }

    function renderLine(focus, token) {
      const width = 1020, height = 470, m = {t:26,r:22,b:54,l:66};
      const w = width-m.l-m.r, h = height-m.t-m.b;
      const vals = portfolio.map(d => +d.observed_rd3m);
      const maxY = Math.max(...vals) * 1.12;
      const x = i => m.l + i*w/(portfolio.length-1);
      const y = v => m.t+h-(v/maxY)*h;
      const focalIndex = portfolio.findIndex(d => d.period === focalPeriod);
      const svg = svgNode("svg", {viewBox:`0 0 ${width} ${height}`,class:"risk-line"});
      [0,.25,.5,.75,1].forEach(fr => {
        const yy=y(maxY*fr); svg.appendChild(svgNode("line",{x1:m.l,x2:width-m.r,y1:yy,y2:yy,class:"grid"}));
        const t=svgNode("text",{x:m.l-9,y:yy+4,class:"tick-label","text-anchor":"end"}); t.textContent=`${(100*maxY*fr).toFixed(1)}%`; svg.appendChild(t);
      });
      svg.appendChild(svgNode("line",{x1:m.l,x2:m.l,y1:m.t,y2:m.t+h,class:"axis"}));
      svg.appendChild(svgNode("line",{x1:m.l,x2:width-m.r,y1:m.t+h,y2:m.t+h,class:"axis"}));
      const path = portfolio.map((d,i)=>`${i?"L":"M"}${x(i)},${y(+d.observed_rd3m)}`).join(" ");
      const line = svgNode("path",{d:path,class:focus?"portfolio-line muted":"portfolio-line draw-line"}); svg.appendChild(line);
      [0,Math.floor(portfolio.length/4),Math.floor(portfolio.length/2),Math.floor(3*portfolio.length/4),portfolio.length-1].forEach(i=>{const t=svgNode("text",{x:x(i),y:height-18,class:"tick-label","text-anchor":"middle"});t.textContent=monthLabel(portfolio[i].period,true);svg.appendChild(t);});
      if (focus && focalIndex>=0) {
        const d=portfolio[focalIndex], xx=x(focalIndex), yy=y(+d.observed_rd3m);
        const g=svgNode("g",{class:"focus-group"});
        g.appendChild(svgNode("line",{x1:xx,x2:xx,y1:yy+8,y2:m.t+h,class:"focus-guide"}));
        g.appendChild(svgNode("circle",{cx:xx,cy:yy,r:7,class:"focus-dot"}));
        const t=svgNode("text",{x:xx+14,y:yy-14,class:"focus-value"});t.textContent=`${monthLabel(d.period)} · ${(100*+d.observed_rd3m).toFixed(2)}%`;g.appendChild(t);svg.appendChild(g);
      }
      ui.graphic.replaceChildren(svg);
      requestAnimationFrame(()=>{
        if(token!==runToken)return;
        const length=line.getTotalLength();line.style.strokeDasharray=`${length}`;line.style.strokeDashoffset=`${length}`;
        requestAnimationFrame(()=>{line.style.transition="stroke-dashoffset 2.4s cubic-bezier(.2,.7,.2,1),opacity 1s";line.style.strokeDashoffset="0";});
      });
    }

    function renderDots(token, groupAges) {
      const summary = focal.portfolio[0];
      const total = +summary.loans_at_risk;
      const defaults = +summary.defaults_3m;
      ui.formula.innerHTML = `\\[RD3M_{${monthLabel(focalPeriod).replace(" ","\\,")}}=\\frac{${defaults.toLocaleString("en")}}{${total.toLocaleString("en")}}=${(100*defaults/total).toFixed(2)}\\%\\]`;
      typeset(ui.formula);
      const wrap=document.createElement("div");wrap.className="dot-stage";
      const canvas=document.createElement("canvas");canvas.width=1050;canvas.height=500;canvas.className="loan-canvas";wrap.appendChild(canvas);
      const caption=document.createElement("div");caption.className="dot-caption";caption.innerHTML=`<span><i class="white-key"></i>${total.toLocaleString("en")} loans at risk</span><span><i class="red-key"></i>${defaults.toLocaleString("en")} default in 3 months</span>`;wrap.appendChild(caption);
      ui.graphic.replaceChildren(wrap);
      const ctx=canvas.getContext("2d");
      const cols=Math.ceil(Math.sqrt(total*canvas.width/canvas.height));
      const rowsCount=Math.ceil(total/cols); const sx=(canvas.width-36)/cols, sy=(canvas.height-48)/rowsCount;
      const pts=Array.from({length:total},(_,i)=>({x:18+(i%cols)*sx,y:20+Math.floor(i/cols)*sy}));
      function draw(redCount=0, ageIndex=-1) {
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#dce7ef";ctx.globalAlpha=.78;
        pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.65,Math.min(1.45,sx*.29)),0,Math.PI*2);ctx.fill();});
        ctx.globalAlpha=1;
        if(ageIndex>=0){
          const groups=focal.cells.slice(0,6);let start=0;groups.forEach((g,j)=>{const count=Math.min(+g.loans_at_risk,total-start);if(j===ageIndex){ctx.fillStyle="#8fc8ff";for(let k=start;k<start+count;k++){const p=pts[k];if(!p)break;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,Math.min(2,sx*.4)),0,Math.PI*2);ctx.fill();}}start+=count;});
        }
        ctx.fillStyle="#e56f68";for(let i=0;i<Math.min(redCount,total);i++){const p=pts[i];ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.9,Math.min(1.8,sx*.36)),0,Math.PI*2);ctx.fill();}
      }
      if(!groupAges){
        draw(0);const start=performance.now();const duration=2200;
        const tick=now=>{if(token!==runToken)return;const f=Math.min(1,(now-start)/duration);draw(Math.floor(defaults*f));if(f<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
      } else {
        draw(defaults,-1);const groups=Math.min(5,focal.cells.length);let i=0;
        const cycle=()=>{if(token!==runToken)return;draw(defaults,i);caption.querySelector("span:first-child").innerHTML=`<i class="blue-key"></i>highlighting age ${focal.cells[i].age}`;i=(i+1)%groups;setTimeout(cycle,1350);};setTimeout(cycle,700);
      }
    }

    const sheetSteps = {
      base:["cohort","age","loans_at_risk","defaults_3m","rd3m"],
      q:["cohort","age","loans_at_risk","defaults_3m","rd3m","q"],
      logit:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit"],
      mu:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu"],
      r0:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean"],
      age:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect"],
      r1:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age"],
      cohort:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect"],
      r2:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort"],
      period:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect"],
      r3:["cohort","age","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect","residual_after_period"]
    };

    const labels={cohort:"Cohort",age:"Age",loans_at_risk:"Loans",defaults_3m:"Defaults",rd3m:"RD3M",q:"q",y_logit:"logit(q)",mu:"μ",residual_after_mean:"residual₀",age_effect:"AGE",residual_after_age:"residual₁",cohort_effect:"COHORT",residual_after_cohort:"residual₂",period_effect:"PERIOD",residual_after_period:"residual₃"};

    function renderSheet(scene, token) {
      const columns=sheetSteps[scene.step];
      const stage=document.createElement("div");stage.className="sheet-stage";
      const sheet=document.createElement("div");sheet.className="calc-sheet";sheet.style.setProperty("--cols",columns.length);
      const header=document.createElement("div");header.className="sheet-row sheet-header";columns.forEach(c=>header.appendChild(cell(labels[c],c,true)));sheet.appendChild(header);
      rows.forEach((row,ri)=>{const r=document.createElement("div");r.className="sheet-row";r.dataset.row=ri;r.dataset.age=row.age;r.dataset.cohort=row.cohort;r.dataset.period=row.period;columns.forEach(c=>{const node=cell(formatValue(c,row[c]),c,false);if(scene.deps && !scene.deps.includes(c) && c!==columns[columns.length-1] && !["cohort","age"].includes(c))node.classList.add("dim");if(c===columns[columns.length-1] && scene.step!=="base")node.classList.add("new-col");r.appendChild(node);});sheet.appendChild(r);});
      stage.appendChild(sheet);ui.graphic.replaceChildren(stage);
      if(scene.step!=="base") revealLastColumn(sheet, token);
      if(scene.cycle) cycleGroups(sheet, scene.cycle, columns[columns.length-1], token);
      else if(scene.deps) accentDependencies(sheet,scene.deps);
    }

    function revealLastColumn(sheet, token){const cells=[...sheet.querySelectorAll(".sheet-row:not(.sheet-header) .new-col")];cells.forEach(c=>c.style.opacity="0");cells.forEach((c,i)=>setTimeout(()=>{if(token===runToken)c.style.opacity="1";},500+i*38));}
    function accentDependencies(sheet,deps){[...sheet.querySelectorAll(".sheet-cell")].forEach(c=>{if(!deps.includes(c.dataset.col) && !c.classList.contains("new-col") && !["cohort","age"].includes(c.dataset.col))c.classList.add("soft");});}
    function cycleGroups(sheet,key,outCol,token){
      const groupValues=[...new Set(rows.map(r=>String(r[key])))];let i=0;
      const cycle=()=>{if(token!==runToken)return;const value=groupValues[i];[...sheet.querySelectorAll(".sheet-row:not(.sheet-header)")].forEach(r=>{const on=r.dataset[key]===value;r.classList.toggle("active-group",on);const out=r.querySelector(`[data-col='${outCol}']`);if(out && on)out.classList.add("filled-now");});i+=1;if(i<groupValues.length)setTimeout(cycle,1150);else setTimeout(()=>{[...sheet.querySelectorAll(".sheet-row")].forEach(r=>r.classList.remove("active-group"));},900);};setTimeout(cycle,700);
    }

    function cell(text,col,head){const n=document.createElement("div");n.className=`sheet-cell col-${col}${head?" head":""}`;n.dataset.col=col;n.textContent=text;return n;}
    function formatValue(key,value){if(key==="cohort"||key==="period")return monthLabel(value);if(key==="age"||key==="loans_at_risk"||key==="defaults_3m")return Number(value).toLocaleString("en");const v=+value;if(!Number.isFinite(v))return "—";if(["rd3m","q"].includes(key))return `${(100*v).toFixed(2)}%`;return v.toFixed(3);}
    function typeset(node){if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([node]).catch(()=>{});}
    function svgNode(tag,attrs={}){const n=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;}
    function monthLabel(value,short=false){const d=new Date(`${value}T00:00:00`);return d.toLocaleDateString("en",short?{month:"short",year:"2-digit"}:{month:"short",year:"numeric"});}

    render(0);
  }
})();
</script>
