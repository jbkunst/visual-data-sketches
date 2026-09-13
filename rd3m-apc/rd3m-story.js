<script>
(() => {
  "use strict";

  const root = document.querySelector("[data-rd3m-story]");
  if (!root) return;

  const sourceUrl = new URL(root.dataset.source, window.location.href);
  sourceUrl.searchParams.set("v", root.dataset.dataVersion || "5");

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
      {id:"portfolio", kicker:"1 · Portfolio risk", title:"Risk depends on the horizon", text:"RD3M is the share of loans that are alive at the start of a month and default during that month or either of the next two months. A portfolio could also be measured with RD1M, RD2M, or another forward horizon; here we use three months.", formula:"\\[RD3M_t=\\frac{D_{t:t+2}}{N_t}\\]", mode:"line"},
      {id:"focus", kicker:"2 · One period", title:"Pick one point in time", text:`Now focus on ${monthLabel(focalPeriod)}. The portfolio RD3M at this point is one number, but that number is built from many loans.`, formula:"\\[RD3M_{Apr\,2020}=1.64\\%\\]", mode:"focus"},
      {id:"ratio", kicker:"3 · Numerator and denominator", title:"What does 1.64% actually mean?", text:"The denominator is every loan at risk at the start of April. Three months later, the numerator is the subset that defaulted. The loan field expands from the selected portfolio point; the red marks are the numerator, not a sample.", formula:"", mode:"dots"},
      {id:"ages", kicker:"4 · Inside the denominator", title:"Those loans are not all alike", text:"Keep the same loan population and sweep through age groups. Each highlighted set is a different loan age, and red defaults remain part of the group they belong to.", formula:"\\[period=cohort+age\\]", mode:"ageDots"},
      {id:"base", kicker:"5 · Aggregate the loans", title:"Collapse the points into cohort × age cells", text:"Fade from individual loans into grouped rows. Each row is one cohort-age cell and initially contains only cohort, age, loans at risk, and defaults in the next three months. The sheet stays fixed from here on.", formula:"\\[c=\\text{cohort},\\qquad a=\\text{age}\\]", mode:"sheet", step:"base"},
      {id:"rd3m", kicker:"6 · Cell RD3M", title:"Compute risk inside each cohort-age cell", text:"For every cohort c and age a, divide defaults by loans at risk. Loans and Defaults are the inputs; RD3M is the new result. The subscripts c,a mean that this risk is calculated separately for each cohort-age cell.", formula:"\\[RD3M_{c,a}=\\frac{D^{3M}_{c,a}}{N_{c,a}}\\]", mode:"sheet", step:"rd3m", deps:["loans_at_risk","defaults_3m"]},
      {id:"q", kicker:"7 · Adjust zero cells", title:"Add the adjusted probability", text:"A small add-half correction keeps zero-default cells finite. Loans and Defaults remain the only inputs used here; q is the new output.", formula:"\\[q_i=\\frac{D_i+0.5}{N_i+1}\\]", mode:"sheet", step:"q", deps:["defaults_3m","loans_at_risk"]},
      {id:"logit", kicker:"8 · Change scale", title:"Move to log-odds", text:"RD3M is bounded between zero and one. The logit moves the adjusted probability onto an additive scale. Only q is used to create logit(q).", formula:"\\[y_i=\\operatorname{logit}(q_i)=\\log\\!\\left(\\frac{q_i}{1-q_i}\\right)\\]", mode:"sheet", step:"logit", deps:["q"]},
      {id:"mu", kicker:"9 · Global baseline", title:"Start from one weighted level", text:"All visible logit values contribute to the baseline, weighted by loans at risk. Loans and logit(q) stay blue while every unused column fades back.", formula:"\\[\\mu=\\frac{\\sum_i N_i y_i}{\\sum_i N_i}\\]", mode:"sheet", step:"mu", deps:["loans_at_risk","y_logit"]},
      {id:"r0", kicker:"10 · First residual", title:"What is left after the baseline?", text:"For each row, subtract μ from logit(q). Only logit(q) and μ remain blue; residual₀ is written in the warm output color.", formula:"\\[r_i^{(0)}=y_i-\\mu\\]", mode:"sheet", step:"r0", deps:["y_logit","mu"]},
      {id:"age", kicker:"11 · AGE", title:"Fill AGE one group at a time", text:"AGE uses age, loans at risk, and residual₀. The animation cycles through age groups, highlights only the rows used in each weighted mean, and then writes the AGE value for that group.", formula:"\\[A_a=\\frac{\\sum_{i:age_i=a}N_i r_i^{(0)}}{\\sum_{i:age_i=a}N_i}\\]", mode:"sheet", step:"age", deps:["age","loans_at_risk","residual_after_mean"], cycle:"age"},
      {id:"r1", kicker:"12 · Residual after AGE", title:"Subtract the AGE contribution", text:"Now only residual₀ and AGE remain prominent. Their difference creates residual₁.", formula:"\\[r_i^{(1)}=r_i^{(0)}-A_{age_i}\\]", mode:"sheet", step:"r1", deps:["residual_after_mean","age_effect"]},
      {id:"cohort", kicker:"13 · COHORT", title:"Fill COHORT one origination month at a time", text:"COHORT works on what AGE left behind. Cohort, loans at risk, and residual₁ are the inputs. Rows from the same origination cohort light up together before the result is written.", formula:"\\[C_c=\\frac{\\sum_{i:cohort_i=c}N_i r_i^{(1)}}{\\sum_{i:cohort_i=c}N_i}\\]", mode:"sheet", step:"cohort", deps:["cohort","loans_at_risk","residual_after_age"], cycle:"cohort"},
      {id:"r2", kicker:"14 · Residual after COHORT", title:"Subtract the COHORT contribution", text:"The next residual is what remains after both AGE and COHORT have been removed. Only residual₁ and COHORT are used.", formula:"\\[r_i^{(2)}=r_i^{(1)}-C_{cohort_i}\\]", mode:"sheet", step:"r2", deps:["residual_after_age","cohort_effect"]},
      {id:"period", kicker:"15 · PERIOD", title:"Finish with calendar time", text:"Rows sharing the same period now light up together. In cohort-age geometry they form diagonals. PERIOD uses loans at risk and residual₂ within each calendar period.", formula:"\\[P_p=\\frac{\\sum_{i:period_i=p}N_i r_i^{(2)}}{\\sum_{i:period_i=p}N_i}\\]", mode:"sheet", step:"period", deps:["loans_at_risk","residual_after_cohort"], cycle:"period"},
      {id:"r3", kicker:"16 · Final residual", title:"What remains is cell-level residual", text:"Subtract PERIOD from residual₂ and the sequential decomposition is complete. Every new column came from columns already visible to its left.", formula:"\\[r_i^{(3)}=r_i^{(2)}-P_{period_i}\\]", mode:"sheet", step:"r3", deps:["residual_after_cohort","period_effect"]}
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
      const previous = scenes[active];
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

      const paint = () => {
        if (scene.mode === "line") renderLine(false, token);
        if (scene.mode === "focus") renderLine(true, token);
        if (scene.mode === "dots") renderDots(token, false);
        if (scene.mode === "ageDots") renderDots(token, true);
        if (scene.mode === "sheet") renderSheet(scene, token);
      };

      if (previous?.id === "ages" && scene.id === "base") {
        ui.graphic.classList.add("graphic-fade-out");
        setTimeout(() => {
          if (token !== runToken) return;
          paint();
          ui.graphic.classList.remove("graphic-fade-out");
          ui.graphic.classList.add("graphic-fade-in");
          setTimeout(() => ui.graphic.classList.remove("graphic-fade-in"), 700);
        }, 420);
      } else {
        paint();
      }
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
      if (!focus) {
        requestAnimationFrame(()=>{
          if(token!==runToken)return;
          const length=line.getTotalLength();line.style.strokeDasharray=`${length}`;line.style.strokeDashoffset=`${length}`;
          requestAnimationFrame(()=>{line.style.transition="stroke-dashoffset 2.8s cubic-bezier(.2,.7,.2,1),opacity 1s";line.style.strokeDashoffset="0";});
        });
      }
    }

    function renderDots(token, groupAges) {
      const summary = focal.portfolio[0];
      const total = +summary.loans_at_risk;
      const defaults = +summary.defaults_3m;
      ui.formula.innerHTML = `\\[RD3M_{${monthLabel(focalPeriod).replace(" ","\\,")}}=\\frac{${defaults.toLocaleString("en")}}{${total.toLocaleString("en")}}=${(100*defaults/total).toFixed(2)}\\%\\]`;
      typeset(ui.formula);

      const wrap=document.createElement("div");wrap.className="dot-stage";
      const caption=document.createElement("div");caption.className="dot-caption";
      const canvas=document.createElement("canvas");canvas.width=1050;canvas.height=500;canvas.className="loan-canvas";
      wrap.append(caption, canvas);
      ui.graphic.replaceChildren(wrap);

      const ctx=canvas.getContext("2d");
      const cols=Math.ceil(Math.sqrt(total*canvas.width/canvas.height));
      const rowsCount=Math.ceil(total/cols);
      const sx=(canvas.width-36)/cols, sy=(canvas.height-48)/rowsCount;
      const pts=Array.from({length:total},(_,i)=>({x:18+(i%cols)*sx,y:20+Math.floor(i/cols)*sy}));
      const origin={x:canvas.width*.52,y:canvas.height*.36};
      const groups=focal.cells.slice(0,Math.min(5,focal.cells.length));
      const groupStarts=[];
      let cursor=0;
      groups.forEach(g=>{groupStarts.push(cursor);cursor+=Math.min(+g.loans_at_risk,total-cursor);});

      function pointRadius(scale=1){return Math.max(.7,Math.min(1.55,sx*.3))*scale;}
      function draw(expand=1, redCount=defaults, ageIndex=-1) {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.globalAlpha=.72;
        ctx.fillStyle="#dce7ef";
        pts.forEach(p=>{
          const x=origin.x+(p.x-origin.x)*expand;
          const y=origin.y+(p.y-origin.y)*expand;
          ctx.beginPath();ctx.arc(x,y,pointRadius(),0,Math.PI*2);ctx.fill();
        });
        ctx.globalAlpha=1;

        if(ageIndex>=0){
          const start=groupStarts[ageIndex];
          const count=Math.min(+groups[ageIndex].loans_at_risk,total-start);
          ctx.fillStyle="#8fc8ff";
          for(let k=start;k<start+count;k++){
            const p=pts[k];if(!p)break;
            ctx.beginPath();ctx.arc(p.x,p.y,pointRadius(1.35),0,Math.PI*2);ctx.fill();
          }
          const dcount=Math.min(+groups[ageIndex].defaults_3m,count);
          ctx.fillStyle="#e56f68";
          for(let k=start;k<start+dcount;k++){
            const p=pts[k];if(!p)break;
            ctx.beginPath();ctx.arc(p.x,p.y,pointRadius(1.55),0,Math.PI*2);ctx.fill();
          }
        } else {
          ctx.fillStyle="#e56f68";
          for(let i=0;i<Math.min(redCount,total);i++){
            const p=pts[i];
            const x=origin.x+(p.x-origin.x)*expand;
            const y=origin.y+(p.y-origin.y)*expand;
            ctx.beginPath();ctx.arc(x,y,pointRadius(1.45),0,Math.PI*2);ctx.fill();
          }
        }
      }

      if(!groupAges){
        caption.innerHTML=`<span><i class="white-key"></i>${total.toLocaleString("en")} loans at risk</span><span><i class="red-key"></i>${defaults.toLocaleString("en")} defaults in 3 months</span>`;
        const expandStart=performance.now();
        const expandDuration=1900;
        const expandTick=now=>{
          if(token!==runToken)return;
          const t=Math.min(1,(now-expandStart)/expandDuration);
          const eased=1-Math.pow(1-t,3);
          draw(eased,0,-1);
          if(t<1){requestAnimationFrame(expandTick);return;}
          const redStart=performance.now();
          const redDuration=1900;
          const redTick=now2=>{
            if(token!==runToken)return;
            const f=Math.min(1,(now2-redStart)/redDuration);
            draw(1,Math.floor(defaults*f),-1);
            if(f<1)requestAnimationFrame(redTick);
          };
          requestAnimationFrame(redTick);
        };
        requestAnimationFrame(expandTick);
      } else {
        caption.innerHTML=`<span class="active-age"><i class="blue-key"></i>Loans with age ${groups[0].age}</span><span><i class="red-key"></i>defaults remain inside the age group</span>`;
        draw(1,defaults,0);
        let i=0;
        const cycle=()=>{
          if(token!==runToken)return;
          canvas.classList.add("canvas-fade");
          setTimeout(()=>{
            if(token!==runToken)return;
            draw(1,defaults,i);
            caption.querySelector(".active-age").innerHTML=`<i class="blue-key"></i>Loans with age ${groups[i].age}`;
            canvas.classList.remove("canvas-fade");
            i=(i+1)%groups.length;
            setTimeout(cycle,1500);
          },350);
        };
        setTimeout(cycle,1550);
      }
    }

    const sheetSteps = {
      base:["cohort","age","loans_at_risk","defaults_3m"],
      rd3m:["cohort","age","loans_at_risk","defaults_3m","rd3m"],
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

    const fullColumns=sheetSteps.r3;
    const labels={cohort:"Cohort",age:"Age",loans_at_risk:"Loans",defaults_3m:"Defaults",rd3m:"RD3M",q:"q",y_logit:"logit(q)",mu:"μ",residual_after_mean:"residual₀",age_effect:"AGE",residual_after_age:"residual₁",cohort_effect:"COHORT",residual_after_cohort:"residual₂",period_effect:"PERIOD",residual_after_period:"residual₃"};

    function renderSheet(scene, token) {
      const visible=sheetSteps[scene.step];
      const output=visible[visible.length-1];
      const stage=document.createElement("div");stage.className="sheet-stage";
      const sheet=document.createElement("div");sheet.className="calc-sheet";
      const header=document.createElement("div");header.className="sheet-row sheet-header";
      fullColumns.forEach(c=>{
        const node=cell(labels[c],c,true);
        if(!visible.includes(c))node.classList.add("future-col");
        if(scene.step!=="base" && c===output)node.classList.add("new-col");
        else if(scene.deps?.includes(c))node.classList.add("input-col");
        else if(scene.step!=="base" && visible.includes(c))node.classList.add("dim");
        header.appendChild(node);
      });
      sheet.appendChild(header);

      rows.forEach((row,ri)=>{
        const r=document.createElement("div");r.className="sheet-row";r.dataset.row=ri;r.dataset.age=row.age;r.dataset.cohort=row.cohort;r.dataset.period=row.period;
        fullColumns.forEach(c=>{
          const node=cell(formatValue(c,row[c]),c,false);
          if(!visible.includes(c))node.classList.add("future-col");
          if(scene.step!=="base" && c===output)node.classList.add("new-col");
          else if(scene.deps?.includes(c))node.classList.add("input-col");
          else if(scene.step!=="base" && visible.includes(c))node.classList.add("dim");
          r.appendChild(node);
        });
        sheet.appendChild(r);
      });

      stage.appendChild(sheet);ui.graphic.replaceChildren(stage);
      if(scene.step!=="base" && !scene.cycle)revealLastColumn(sheet, token);
      if(scene.cycle)cycleGroups(sheet, scene.cycle, output, token);
    }

    function revealLastColumn(sheet, token){
      const cells=[...sheet.querySelectorAll(".sheet-row:not(.sheet-header) .new-col:not(.future-col)")];
      cells.forEach(c=>c.style.opacity="0");
      cells.forEach((c,i)=>setTimeout(()=>{if(token===runToken)c.style.opacity="1";},550+i*42));
    }

    function cycleGroups(sheet,key,outCol,token){
      const groupValues=[...new Set(rows.map(r=>String(r[key])))];
      const outputs=[...sheet.querySelectorAll(`.sheet-row:not(.sheet-header) [data-col='${outCol}']`)];
      outputs.forEach(c=>{c.style.opacity="0";});
      let i=0;
      const cycle=()=>{
        if(token!==runToken)return;
        const value=groupValues[i];
        [...sheet.querySelectorAll(".sheet-row:not(.sheet-header)")].forEach(r=>{
          const on=r.dataset[key]===value;
          r.classList.toggle("active-group",on);
          const out=r.querySelector(`[data-col='${outCol}']`);
          if(out && on){out.style.opacity="1";out.classList.add("filled-now");}
        });
        i+=1;
        if(i<groupValues.length)setTimeout(cycle,1350);
        else setTimeout(()=>{[...sheet.querySelectorAll(".sheet-row")].forEach(r=>r.classList.remove("active-group"));},950);
      };
      setTimeout(cycle,750);
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