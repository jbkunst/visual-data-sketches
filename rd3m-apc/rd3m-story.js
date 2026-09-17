<script>
(() => {
  "use strict";

  const root = document.querySelector("[data-rd3m-story]");
  if (!root) return;

  const sourceUrl = new URL(root.dataset.source, window.location.href);
  sourceUrl.searchParams.set("v", root.dataset.dataVersion || "6");

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
    const riskRow = rows.find(r => r.period === focalPeriod && +r.age === 3) || rows[0];
    const riskComponents = [
      {key:"risk_base", label:"Baseline", color:"#91a9bb"},
      {key:"contribution_age", label:"AGE", color:"#56b4e9"},
      {key:"contribution_cohort", label:"COHORT", color:"#009e73"},
      {key:"contribution_period", label:"PERIOD", color:"#f2c66d"}
    ];
   const portfolioYMax = 0.06;
   let active = 0;
   let runToken = 0;
    const i18n=window.RD3M_I18N || {es:{ui:{},scenes:{}}};
    let language=new URLSearchParams(window.location.search).get("lang")==="es" ? "es" : "en";

    const scenes = [
      {id:"portfolio", kicker:"1 · Portfolio risk", title:"Measuring risk", text:"There are several ways to measure portfolio risk. A common view of its evolution is the default rate: defaults over the loans at risk at the start of a period. It can use different forward horizons. Here we use three months, so RD3M is defaults from month \\(t\\) through \\(t+2\\), divided by the loans at risk at \\(t\\).", formula:"\\[RD3M_t=\\frac{D_{t:t+2}}{N_t}\\]", mode:"line"},
      {id:"focus", kicker:"2 · One period", title:"Look at one point in time", text:`Now let’s look at ${monthLabel(focalPeriod)}. The portfolio RD3M at this point is one number, but that number is built from many loans.`, formula:"", mode:"focus"},
      {id:"ratio", kicker:"3 · Numerator and denominator", title:"What does this rate actually mean?", text:`The denominator is every loan at risk at the start of ${monthLabel(focalPeriod)}. Three months later, the numerator is the subset that defaulted. These are the complete loans and defaults for the focal period, not a sample.`, formula:"", mode:"dots"},
      {id:"ages", kicker:"4 · Inside the denominator", title:"Those loans are not all alike", text:"Keep the same loan population and separate it into age groups. Each group represents a different loan age, and defaults remain allocated to the age group in which they occur.", formula:"", mode:"ageDots"},
      {id:"base", kicker:"5 · Aggregate the loans", title:"Group loans into cohort × age cells", text:"Group individual loans into cells defined by cohort and age. Each cell contains its cohort, age, loans at risk, and defaults over the following three months. There are many such combinations, so this worked example uses a small teaching window. Later portfolio aggregates use the full available history.", formula:"\\[c:=\\text{cohort},\\qquad a:=\\text{age},\\qquad p_{c,a}:=c+a\\]", mode:"sheet", step:"base"},
      {id:"rd3m", kicker:"6 · Cell RD3M", title:"Compute risk in each cell", text:"For every cohort \\(c\\) and age \\(a\\), divide defaults by loans at risk to obtain \\(RD3M_{c,a}\\). Weighting these cell rates by loans within a calendar period reconstructs that period's portfolio RD3M. A window of five ages and five periods keeps this worked example readable.", formula:"\\[RD3M_{c,a}=\\frac{D^{3M}_{c,a}}{N_{c,a}}\\]", mode:"sheet", step:"rd3m", deps:["loans_at_risk","defaults_3m"]},
      {id:"q", kicker:"7 · Adjust zero cells", title:"Add the adjusted probability", text:"Some cohort-age cells have zero defaults, so their raw rate is zero and \\(\\operatorname{logit}(0)=-\\infty\\). We add 0.5 to defaults and 0.5 to non-defaults: the numerator gains 0.5 and the denominator gains 1. This keeps \\(q_{c,a}\\) finite while barely changing large cells.", formula:"\\[q_{c,a}=\\frac{D^{3M}_{c,a}+0.5}{N_{c,a}+1}\\]", mode:"sheet", step:"q", deps:["defaults_3m","loans_at_risk"]},
      {id:"logit", kicker:"8 · Change scale", title:"Move to log-odds", text:"RD3M is bounded between zero and one. The logit moves the adjusted probability onto an additive scale. Only \\(q_{c,a}\\) is used to create \\(y_{c,a}=\\operatorname{logit}(q_{c,a})\\).", formula:"\\[y_{c,a}=\\operatorname{logit}(q_{c,a})=\\log\\!\\left(\\frac{q_{c,a}}{1-q_{c,a}}\\right)\\]", mode:"sheet", step:"logit", deps:["q"]},
      {id:"mu", kicker:"9 · Global baseline", title:"Start from one weighted level", text:"The baseline \\(\\mu\\) is the average adjusted log odds across all cells, weighted by loans. It is the common portfolio level before describing how age, cohort, and calendar period differ from it.", formula:"\\[\\mu=\\frac{\\sum\\limits_{c,a}N_{c,a}\\,y_{c,a}}{\\sum\\limits_{c,a}N_{c,a}}\\]", mode:"sheet", step:"mu", deps:["loans_at_risk","y_logit"]},
      {id:"r0", kicker:"10 · First residual", title:"What is left after the baseline?", text:"For each cell, subtract \\(\\mu\\) from \\(y_{c,a}=\\operatorname{logit}(q_{c,a})\\). The residual \\(r_{c,a}^{(0)}\\) is that cell's deviation from the common portfolio level on the log odds scale. It is the starting point for AGE.", formula:"\\[r_{c,a}^{(0)}=y_{c,a}-\\mu\\]", mode:"sheet", step:"r0", deps:["y_logit","mu"]},
      {id:"age", kicker:"11 · AGE", title:"Estimate AGE one group at a time", text:"Starting from \\(r_{c,a}^{(0)}\\), for each age \\(a\\), \\(A_a\\) is its average across all cohorts \\(c\\) at that age, weighted by loans. It is the average log odds deviation associated with that age group, before separating cohort and period.", formula:"\\[A_a=\\frac{\\sum\\limits_{c}N_{c,a}\\,r_{c,a}^{(0)}}{\\sum\\limits_{c}N_{c,a}}\\]", mode:"sheet", step:"age", deps:["age","loans_at_risk","residual_after_mean"], cycle:"age"},
      {id:"r1", kicker:"12 · Residual after AGE", title:"Subtract the AGE contribution", text:"Subtract \\(A_a\\) from the starting residual \\(r_{c,a}^{(0)}\\). The remainder \\(r_{c,a}^{(1)}\\) is what AGE does not explain, and it becomes the input for COHORT.", formula:"\\[r_{c,a}^{(1)}=r_{c,a}^{(0)}-A_a\\]", mode:"sheet", step:"r1", deps:["residual_after_mean","age_effect"]},
      {id:"cohort", kicker:"13 · COHORT", title:"Estimate COHORT one origination month at a time", text:"For each cohort \\(c\\), \\(C_c\\) is the loans-weighted average of the residual after AGE, \\(r_{c,a}^{(1)}\\), across all ages \\(a\\) in that cohort. It is the cohort-specific log-odds deviation remaining after AGE has been accounted for.", formula:"\\[C_c=\\frac{\\sum\\limits_{a}N_{c,a}\\,r_{c,a}^{(1)}}{\\sum\\limits_{a}N_{c,a}}\\]", mode:"sheet", step:"cohort", deps:["cohort","loans_at_risk","residual_after_age"], cycle:"cohort"},
      {id:"r2", kicker:"14 · Residual after COHORT", title:"Subtract the COHORT contribution", text:"Subtract \\(C_c\\) from the residual after AGE, \\(r_{c,a}^{(1)}\\). The result, \\(r_{c,a}^{(2)}\\), is what remains for PERIOD to explain.", formula:"\\[r_{c,a}^{(2)}=r_{c,a}^{(1)}-C_c\\]", mode:"sheet", step:"r2", deps:["residual_after_age","cohort_effect"]},
      {id:"period", kicker:"15 · PERIOD", title:"Finish with calendar time", text:"The residual \\(r_{c,a}^{(2)}\\) contains what AGE and COHORT leave behind. For each calendar period \\(p\\), \\(P_p\\) is its average across all cells with \\(p_{c,a}=p\\), weighted by loans. It is the common calendar time deviation that remains after AGE and COHORT.", formula:"\\[P_p=\\frac{\\sum\\limits_{(c,a):\,p_{c,a}=p}N_{c,a}\\,r_{c,a}^{(2)}}{\\sum\\limits_{(c,a):\,p_{c,a}=p}N_{c,a}}\\]", mode:"sheet", step:"period", deps:["period","loans_at_risk","residual_after_cohort"], cycle:"period"},
      {id:"r3", kicker:"16 · Final residual", title:"What remains is a cell residual", text:"Subtract \\(P_{p_{c,a}}\\) from \\(r_{c,a}^{(2)}\\). The sequential decomposition is now complete, and \\(r_{c,a}^{(3)}\\) is the part specific to each cell that the systematic effects do not explain.", formula:"\\[r_{c,a}^{(3)}=r_{c,a}^{(2)}-P_{p_{c,a}}\\]", mode:"sheet", step:"r3", deps:["residual_after_cohort","period_effect"]},
      {id:"fitted", kicker:"17 · Fitted logit", title:"Add the systematic effects", text:"The three systematic effects are now estimated. Add them to the common baseline to obtain the fitted logit \\(\\hat y_{c,a}\\). It is the explained part before the final cell residual is added.", formula:"\\[\\hat y_{c,a}=\\mu+A_a+C_c+P_{p_{c,a}}\\]", mode:"sheet", step:"fitted", deps:["mu","age_effect","cohort_effect","period_effect"]},
      {id:"reconstruct-logit", kicker:"18 · Reconstruct the logit", title:"Recover an existing identity", text:"The fitted logit and the final residual recover the original adjusted logit exactly. This is an equality check, not a new calculation: \\(y_{c,a}=\\operatorname{logit}(q_{c,a})\\) was already computed in step 8.", formula:"\\[y_{c,a}=\\hat y_{c,a}+r_{c,a}^{(3)}\\]", mode:"sheet", step:"reconstruct_logit", output:"y_logit", deps:["fitted_logit","residual_after_period"], identity:true},
      {id:"risk-focus", kicker:"19 · Return to the RD3M scale", title:"Explain one observed risk", text:`Take one cohort-age cell: the ${monthLabel(riskRow.cohort)} cohort at age ${riskRow.age}, observed in ${monthLabel(riskRow.period)}, has RD3M ${(100*Number(riskRow.rd3m)).toFixed(2)}%. We now want to explain that observed risk using the baseline, AGE, COHORT, PERIOD, and the remaining cell contribution.`, formula:"", hideFormula:true, mode:"sheet", step:"reconstruct_logit", noColumnFocus:true, focusRow:{period:"2020-04-01",age:3}},
      {id:"risk-inputs", kicker:"20 · Risk-scale ingredients", title:"Define the risk-scale representation", text:"The goal is an additive representation of RD3M itself. We cannot obtain it by applying inverse logits to the separate logit effects, because the inverse logit is nonlinear. Keep the observed RD3M and the final logit ingredients: \\(\\mu\\), AGE, COHORT, PERIOD, fitted logit \\(\\hat y\\), and \\(r^{(3)}\\). The earlier intermediate residuals are no longer needed.", formula:"\\[RD3M_{c,a}=\\mu'+A'_a+C'_c+P'_{p_{c,a}}+e'_{c,a}\\]", mode:"riskSheet", riskStep:0},
      {id:"risk-base", kicker:"21 · Baseline risk", title:"Begin a sequential path", text:"A logit effect has no fixed percentage-point meaning on its own: its impact on risk depends on the level we start from. So begin at the common baseline probability, \\(\\mu'=\\operatorname{plogis}(\\mu)\\).", formula:"\\[\\mu'=\\operatorname{plogis}(\\mu)\\]", mode:"riskSheet", riskStep:1},
      {id:"risk-age", kicker:"22 · AGE on the risk scale", title:"Create A′", text:"\\(\\operatorname{plogis}(\\mu+A_a)\\) is the predicted risk after adding AGE, before COHORT and PERIOD. \\(A'_a\\) is the change from the common baseline to that risk: the first sequential increment.", formula:"\\[A'_a=\\operatorname{plogis}(\\mu+A_a)-\\operatorname{plogis}(\\mu)\\]", mode:"riskSheet", riskStep:2},
      {id:"risk-cohort", kicker:"23 · COHORT on the risk scale", title:"Create C′", text:"COHORT is the next incremental change, after baseline and AGE are already present.", formula:"\\[C'_c=\\operatorname{plogis}(\\mu+A_a+C_c)-\\operatorname{plogis}(\\mu+A_a)\\]", mode:"riskSheet", riskStep:3},
      {id:"risk-period", kicker:"24 · PERIOD on the risk scale", title:"Create P′", text:"PERIOD is the final systematic increment. At this point the components sum to the fitted risk for each cell.", formula:"\\[P'_p=\\operatorname{plogis}(\\mu+A_a+C_c+P_p)-\\operatorname{plogis}(\\mu+A_a+C_c)\\]", mode:"riskSheet", riskStep:4},
      {id:"risk-residual", kicker:"25 · Cell-level remainder", title:"Create e′", text:"The final risk-scale remainder is the gap from fitted risk to the observed RD3M. It closes the cell-level identity exactly.", formula:"\\[e'_{c,a}=RD3M_{c,a}-\\operatorname{plogis}(\\hat y_{c,a})\\]", mode:"riskSheet", riskStep:5},
      {id:"risk-identity", kicker:"26 · RD3M identity", title:"The risk components reconstruct every cell", text:"By construction, the five risk-scale terms sum to the observed RD3M in every cohort-age cell. This identity is the basis for aggregating the effects to the portfolio level.", formula:"\\[RD3M_{c,a}=\\mu'+A'_a+C'_c+P'_{p_{c,a}}+e'_{c,a}\\]", mode:"riskSheet", riskStep:5, colorEffects:true},
      {id:"period-aggregate", kicker:"27 · Aggregate by period", title:"Weight the cell effects by loans", text:"The worked cell window is now over: these values use every cohort-age cell in the full portfolio history. Within each calendar period, aggregate every component using Loans as weights. The barred terms are the portfolio-level contributions and reconstruct portfolio RD3M.", formula:"\\[RD3M_p=\\overline{\\mu'}_p+\\overline{A'}_p+\\overline{C'}_p+\\overline{P'}_p+\\overline{e'}_p\\]", mode:"periodTable"},
      {id:"portfolio-return", kicker:"28 · Portfolio RD3M", title:"Return to the original portfolio view", text:"The same period-by-period calculation can now be applied to the full portfolio. Return to the RD3M series from the opening scene; the next steps will add its aggregated components one at a time.", formula:"\\[RD3M_t=\\frac{D_{t:t+2}}{N_t}\\]", mode:"portfolioPrelude"},
      {id:"portfolio-base", kicker:"29 · Baseline", title:"Start the portfolio decomposition", text:"For every portfolio period, begin with the common baseline risk. It is constant because \\(\\mu\\) is constant, and it is expressed here in percentage-point risk terms.", formula:"\\[RD3M_t\\approx\\overline{\\mu'}_t\\]", mode:"portfolioStacked", stackStep:1},
      {id:"portfolio-age", kicker:"30 · Add AGE", title:"Add the AGE contribution", text:"Next add the AGE increment in each period, weighted by loans. AGE can increase or reduce the risk relative to the common baseline.", formula:"\\[RD3M_t\\approx\\overline{\\mu'}_t+\\overline{A'}_t\\]", mode:"portfolioStacked", stackStep:2},
      {id:"portfolio-cohort", kicker:"31 · Add COHORT", title:"Add the COHORT contribution", text:"Next add the loans-weighted COHORT increment. Together with the baseline and AGE contribution, it gives the risk implied by these three parts of the decomposition.", formula:"\\[RD3M_t\\approx\\overline{\\mu'}_t+\\overline{A'}_t+\\overline{C'}_t\\]", mode:"portfolioStacked", stackStep:3},
      {id:"portfolio-period", kicker:"32 · Add PERIOD", title:"Add the PERIOD contribution", text:"PERIOD completes the systematic fitted risk. Baseline, AGE, COHORT, and PERIOD may each be positive or negative relative to zero.", formula:"\\[RD3M_t\\approx\\overline{\\mu'}_t+\\overline{A'}_t+\\overline{C'}_t+\\overline{P'}_t\\]", mode:"portfolioStacked", stackStep:4},
      {id:"portfolio-residual", kicker:"33 · Close with the residual", title:"Add the residual contribution", text:"Finally add the residual, the cell-level remainder after the systematic components. Together, all five components sum to the observed portfolio RD3M.", formula:"\\[RD3M_t=\\overline{\\mu'}_t+\\overline{A'}_t+\\overline{C'}_t+\\overline{P'}_t+\\overline{e'}_t\\]", mode:"portfolioStacked", stackStep:5},
      {id:"portfolio-reconstructed", kicker:"34 · Reconstructed RD3M", title:"The components recover the original series", text:"The sum of every signed component recovers the original portfolio RD3M series exactly. This is the final risk-scale representation: baseline, AGE, COHORT, PERIOD, and the remaining cell contribution. It is useful for explanation, but not unique; component contributions depend on the sequential order chosen for the calculation. The equality holds because the decomposition was constructed to close in every cell before aggregation.", formula:"\\[RD3M_t=\\overline{\\mu'}_t+\\overline{A'}_t+\\overline{C'}_t+\\overline{P'}_t+\\overline{e'}_t\\]", mode:"portfolioFinal"},
      {id:"effect-facets", kicker:"35 · Read the components", title:"What can move portfolio risk?", text:"These paths separate the sources of changes in RD3M. AGE reflects the portfolio's age mix, so its contribution should also tend to remain stable when that mix is stable. A large COHORT contribution can signal differences between particular originations that merit investigation, such as a campaign, underwriting change, or borrower mix. A large PERIOD contribution is common across cells and can signal a calendar shock or crisis. COHORT and PERIOD are descriptive signals, not causal proof. All panels use the same vertical scale, and the residual is close to zero by construction.", formula:"", hideFormula:true, mode:"effectFacets"}
    ];

    root.innerHTML = `
      <div class="story-shell">
        <header class="story-header"><p class="story-brand"></p><div class="story-language" aria-label="Language"><button type="button" data-language="en">EN</button><button type="button" data-language="es">ES</button></div></header>
        <section class="story-copy"><p class="story-step"></p><h1></h1><p class="story-text"></p><div class="story-formula"></div></section>
        <section class="story-graphic" aria-live="polite"></section>
        <footer class="story-nav"><button class="prev" aria-label="Previous">←</button><div class="dots"></div><button class="next" aria-label="Next">→</button></footer>
        <a class="story-site-link" href="https://jkunst.com">jkunst.com</a>
      </div>`;

    const ui = {
      step: root.querySelector(".story-step"), title: root.querySelector("h1"), text: root.querySelector(".story-text"), formula: root.querySelector(".story-formula"), graphic: root.querySelector(".story-graphic"), dots: root.querySelector(".dots"), prev: root.querySelector(".prev"), next: root.querySelector(".next"), language: [...root.querySelectorAll("[data-language]")], brand: root.querySelector(".story-brand")
   };

    function localizedScene(scene){
      if(language!=="es")return scene;
      const translated=i18n.es?.scenes?.[scene.id];
      if(!translated)return scene;
      const tokens={period:monthLabel(focalPeriod),cohort:monthLabel(riskRow.cohort),age:riskRow.age,rd3m:`${(100*Number(riskRow.rd3m)).toFixed(2)}%`};
      const text=(translated.text || scene.text).replace(/\{(period|cohort|age|rd3m)\}/g,(_,key)=>tokens[key]);
      return {...scene,...translated,text};
    }

    function uiText(key, fallback){return language==="es" ? (i18n.es?.ui?.[key] || fallback) : fallback;}
    function componentLabel(component){
      if(language!=="es")return component.label;
      return ({risk_base:uiText("baseline","Baseline"),base:uiText("baseline","Baseline"),residual_component:uiText("residual","Residual"),contribution_residual:uiText("residual","Residual")})[component.key] || component.label;
    }

    function setLanguage(nextLanguage){
      language=nextLanguage;
      document.documentElement.lang=language;
      root.querySelector(".story-language").setAttribute("aria-label",uiText("language","Language"));
      ui.brand.textContent=uiText("brand","Decomposing credit risk by AGE, COHORT and PERIOD");
      ui.language.forEach(button=>button.classList.toggle("active",button.dataset.language===language));
      render(active);
    }

   scenes.forEach((scene, i) => {
     const button = document.createElement("button");
     button.setAttribute("aria-label", `Scene ${i + 1}: ${scene.title}`);
     button.onclick = () => render(i);
     ui.dots.appendChild(button);
   });
    ui.language.forEach(button=>button.onclick=()=>setLanguage(button.dataset.language));
    ui.language.forEach(button=>button.classList.toggle("active",button.dataset.language===language));
    root.querySelector(".story-language").setAttribute("aria-label",uiText("language","Language"));
    ui.brand.textContent=uiText("brand","Decomposing credit risk by AGE, COHORT and PERIOD");
   ui.prev.onclick = () => render(Math.max(0, active - 1));
    ui.next.onclick = () => render(Math.min(scenes.length - 1, active + 1));
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") render(Math.min(scenes.length - 1, active + 1));
      if (event.key === "ArrowLeft") render(Math.max(0, active - 1));
    });

    function render(index) {
      const previous = scenes[active];
      const focusAnchor = previous?.id === "focus" && scenes[index]?.id === "ratio" ? captureFocusAnchor() : null;
      active = index;
      runToken += 1;
     const token = runToken;
     const scene = scenes[index];
      const copy = localizedScene(scene);
     ui.graphic.classList.remove("portfolio-axis-anchor", "portfolio-axis-prelude");
     ui.step.textContent = copy.kicker;
     ui.title.textContent = copy.title;
     ui.text.innerHTML = copy.text;
      root.setAttribute("aria-label",language==="es" ? "Explicación visual del riesgo de crédito a tres meses y su descomposición por edad, cohorte y período" : "Visual explanation of three-month credit risk and its age, cohort and period decomposition");
      ui.formula.innerHTML = scene.formula || "";
      ui.formula.classList.toggle("formula-hidden", Boolean(scene.hideFormula));
      typeset(ui.text);
      typeset(ui.formula);
      [...ui.dots.children].forEach((dot, i) => {dot.classList.toggle("active", i === index);dot.setAttribute("aria-label", `${language==="es" ? "Escena" : "Scene"} ${i + 1}: ${localizedScene(scenes[i]).title}`);});
      ui.prev.setAttribute("aria-label",uiText("previous","Previous"));
      ui.next.setAttribute("aria-label",uiText("next","Next"));
      ui.prev.disabled = index === 0;
      ui.next.disabled = index === scenes.length - 1;

      const paint = () => {
        if (scene.mode === "line") renderLine(false, token);
        if (scene.mode === "focus") renderLine(true, token);
        if (scene.mode === "dots") renderDots(token, false, focusAnchor);
        if (scene.mode === "ageDots") renderDots(token, true);
        if (scene.mode === "sheet") renderSheet(scene, token, previous);
        if (scene.mode === "riskSheet") renderRiskSheet(scene, token, previous);
        if (scene.mode === "ingredients") renderIngredients(token);
        if (scene.mode === "ladder") renderRiskLadder(scene, token);
        if (scene.mode === "periodCells") renderPeriodCells(token);
        if (scene.mode === "periodTable") renderPeriodTable(token);
        if (scene.mode === "contributionChart") renderContributionChart(token);
        if (scene.mode === "portfolioStacked") renderPortfolioStacked(scene, token);
        if (scene.mode === "portfolioPrelude") renderPortfolioStacked({...scene, stackStep:0, prelude:true}, token);
        if (scene.mode === "portfolioFinal") renderPortfolioStacked({...scene, stackStep:5, final:true}, token);
        if (scene.mode === "effectFacets") renderEffectFacets(token, !scene.staticFacets);
      };

      if (previous?.id === "focus" && scene.id === "ratio") {
        isolateFocusPoint(token, paint);
      } else if (previous?.id === "ages" && scene.id === "base") {
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

    function captureFocusAnchor() {
      const point = ui.graphic.querySelector(".focus-dot");
      if (!point) return null;

      const rect = point.getBoundingClientRect();
      return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    }

    function isolateFocusPoint(token, done) {
      const point = ui.graphic.querySelector(".focus-dot");
      if (!point) {
        done();
        return;
      }

      const svg = svgNode("svg", {viewBox:"0 0 1020 470", class:"risk-line"});
      point.style.opacity = "1";
      point.style.animation = "none";
      svg.appendChild(point);
      ui.graphic.replaceChildren(svg);
      setTimeout(() => {
        if (token === runToken) done();
      }, 450);
    }

    function renderLine(focus, token) {
      const width = 1020, height = 470, m = {t:52,r:22,b:54,l:66};
      const w = width-m.l-m.r, h = height-m.t-m.b;
      const vals = portfolio.map(d => +d.observed_rd3m);
      const maxY = portfolioYMax;
      const x = i => m.l + i*w/(portfolio.length-1);
      const y = v => m.t+h-(v/maxY)*h;
      const focalIndex = portfolio.findIndex(d => d.period === focalPeriod);

      const svg = svgNode("svg", {viewBox:`0 0 ${width} ${height}`,class:"risk-line"});
      [0,1/3,2/3,1].forEach(fr => {
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
        ui.formula.innerHTML = `\\[RD3M_{${monthLabel(d.period).replace(" ","\\,")}}=\\frac{${(+d.defaults_3m).toLocaleString("en")}}{${(+d.loans_at_risk).toLocaleString("en")}}=${(100*+d.observed_rd3m).toFixed(2)}\\%\\]`;
        typeset(ui.formula);
        const g=svgNode("g",{class:"focus-group"});
        g.appendChild(svgNode("line",{x1:m.l,x2:xx,y1:yy,y2:yy,class:"focus-guide"}));
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

    function renderDots(token, groupAges, focusAnchor = null) {
      const summary = focal.portfolio[0];
      const total = +summary.loans_at_risk;
      const defaults = +summary.defaults_3m;
      let formulaReady=Promise.resolve();
      if(!groupAges){
        ui.formula.innerHTML = `\\[RD3M_{${monthLabel(focalPeriod).replace(" ","\\,")}}=\\frac{${defaults.toLocaleString("en")}}{${total.toLocaleString("en")}}=${(100*defaults/total).toFixed(2)}\\%\\]`;
        formulaReady=typeset(ui.formula);
      }

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
      const canvasRect = canvas.getBoundingClientRect();
      const origin = focusAnchor && canvasRect.width && canvasRect.height ? {
        x: Math.max(0, Math.min(canvas.width, (focusAnchor.x - canvasRect.left) / canvasRect.width * canvas.width)),
        y: Math.max(0, Math.min(canvas.height, (focusAnchor.y - canvasRect.top) / canvasRect.height * canvas.height))
      } : {x:canvas.width*.52,y:canvas.height*.36};
      const groups=focal.cells.slice(0,Math.min(5,focal.cells.length));
      const groupStarts=[];
      let cursor=0;
      groups.forEach(g=>{groupStarts.push(cursor);cursor+=Math.min(+g.loans_at_risk,total-cursor);});

     function ageCaption(ageIndex){
       const group=groups[ageIndex];
        return `<span class="active-age"><i class="blue-key"></i>${language==="es" ? "Edad" : "Age"} ${group.age}</span><span><i class="red-key"></i>${uiText("defaults_within_age","defaults within this age group")}</span>`;
      }

      function setAgeFormula(ageIndex, fade=false){
        const group=groups[ageIndex];
        const numerator=Number(group.defaults_3m).toLocaleString("en");
        const denominator=Number(group.loans_at_risk).toLocaleString("en");
        const rate=(100*Number(group.defaults_3m)/Number(group.loans_at_risk)).toFixed(2);
        const formula=`\\[RD3M_{${monthMath(focalPeriod)},\\,\\mathrm{Age}\\ ${group.age}}=\\frac{\\color[rgb]{0.898,0.435,0.408}{${numerator}}}{\\color[rgb]{0.561,0.784,1}{${denominator}}}=${rate}\\%\\]`;
        const write=()=>{
          if(token!==runToken)return;
          ui.formula.innerHTML=formula;
          typeset(ui.formula);
          ui.formula.classList.remove("formula-fade");
        };
        if(!fade){write();return;}
        ui.formula.classList.add("formula-fade");
        setTimeout(write,360);
      }

      function pointRadius(scale=1){return Math.max(.7,Math.min(1.55,sx*.3))*scale;}
      function drawBase(expand=1){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.globalAlpha=.72;
        ctx.fillStyle="#dce7ef";
        pts.forEach(p=>{
          const x=origin.x+(p.x-origin.x)*expand;
          const y=origin.y+(p.y-origin.y)*expand;
          ctx.beginPath();ctx.arc(x,y,pointRadius(),0,Math.PI*2);ctx.fill();
        });
        ctx.globalAlpha=1;
      }
      function paintAgeGroup(ageIndex,alpha=1){
        if(ageIndex<0 || ageIndex>=groups.length || alpha<=0)return;
        const start=groupStarts[ageIndex];
        const count=Math.min(+groups[ageIndex].loans_at_risk,total-start);
        ctx.globalAlpha=alpha;
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
        ctx.globalAlpha=1;
      }
      function draw(expand=1, redCount=defaults, ageIndex=-1) {
        drawBase(expand);
        if(ageIndex>=0){
          paintAgeGroup(ageIndex,1);
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
        caption.innerHTML=`<span><i class="white-key"></i>${total.toLocaleString("en")} ${uiText("loans_at_risk_caption","loans at risk")}</span><span><i class="red-key"></i>${defaults.toLocaleString("en")} ${uiText("defaults_caption","defaults in 3 months")}</span>`;
        draw(0,0,-1);
        let expandStart;
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
        formulaReady.finally(()=>{
          requestAnimationFrame(()=>requestAnimationFrame(()=>{
            if(token!==runToken)return;
            setTimeout(()=>{if(token!==runToken)return;expandStart=performance.now();requestAnimationFrame(expandTick);},300);
          }));
        });
      } else {
        caption.innerHTML=ageCaption(0);
        setAgeFormula(0);
        draw(1,defaults,0);
        let current=0;
        const cycle=()=>{
          if(token!==runToken)return;
          const next=(current+1)%groups.length;
          setAgeFormula(next,true);
          const start=performance.now();
          const duration=650;
          const tick=now=>{
            if(token!==runToken)return;
            const t=Math.min(1,(now-start)/duration);
            const eased=t*t*(3-2*t);
            drawBase(1);
            paintAgeGroup(current,1-eased);
            paintAgeGroup(next,eased);
            if(t<1){requestAnimationFrame(tick);return;}
            current=next;
            caption.innerHTML=ageCaption(current);
            setTimeout(cycle,1250);
          };
          requestAnimationFrame(tick);
        };
        setTimeout(cycle,1550);
      }
    }

    function riskPercent(value){return `${(100 * Number(value)).toFixed(2)}%`;}

    function renderIngredients(token){
      const panel=document.createElement("div"); panel.className="ingredient-panel";
      const meta=document.createElement("div"); meta.className="ingredient-meta";
      meta.innerHTML=`<span>${uiText("selected_cell","Selected cell")}</span><strong>${monthLabel(riskRow.cohort)} · ${uiText("age","age")} ${riskRow.age}</strong><small>${Number(riskRow.loans_at_risk).toLocaleString("en")} ${uiText("loans_at_risk","loans")} · RD3M ${riskPercent(riskRow.rd3m)}</small>`;
      panel.appendChild(meta);
      const fields=[
        ["μ",riskRow.mu,uiText("baseline_logit","baseline logit")], ["A₃",riskRow.age_effect,uiText("age_logit_effect","AGE logit effect")],
        ["C₍Jan₎",riskRow.cohort_effect,uiText("cohort_logit_effect","COHORT logit effect")], ["P₍Apr₎",riskRow.period_effect,uiText("period_logit_effect","PERIOD logit effect")]
      ];
      const grid=document.createElement("div"); grid.className="ingredient-grid";
      fields.forEach(([label,value,description],i)=>{
        const field=document.createElement("div"); field.className="ingredient-field";
        field.innerHTML=`<span>${label}</span><strong>${Number(value).toFixed(2)}</strong><small>${description}</small>`;
        grid.appendChild(field);
        setTimeout(()=>{if(token===runToken)field.classList.add("is-visible");},350+i*170);
      });
      panel.appendChild(grid);
      ui.graphic.replaceChildren(panel);
    }

    function renderRiskLadder(scene, token){
      const stages = [
        {label:uiText("baseline","baseline"), value:riskRow.risk_base, color:"#91a9bb"},
        {label:"+ AGE", value:riskRow.risk_after_age, color:"#56b4e9"},
        {label:"+ COHORT", value:riskRow.risk_after_cohort, color:"#009e73"},
        {label:"+ PERIOD", value:riskRow.risk_after_period, color:"#f2c66d"},
        {label:`+ ${uiText("residual","residual")}`, value:riskRow.rd3m, color:"#dbe8f2"}
      ];
      const panel=document.createElement("div"); panel.className="risk-ladder";
      const source=document.createElement("div"); source.className="risk-source";
      source.innerHTML=`<div class="risk-source-meta"><span>${uiText("selected_cell","Selected cell")}</span><strong>${monthLabel(riskRow.cohort)} · ${uiText("age","age")} ${riskRow.age}</strong><small>${monthLabel(riskRow.period)} · ${Number(riskRow.loans_at_risk).toLocaleString("en")} ${uiText("loans_at_risk","loans")}</small></div><div class="risk-source-components"><span>μ <b>${Number(riskRow.mu).toFixed(2)}</b></span><span>A₃ <b>${Number(riskRow.age_effect).toFixed(2)}</b></span><span>C<sub>Jan</sub> <b>${Number(riskRow.cohort_effect).toFixed(2)}</b></span><span>P<sub>Apr</sub> <b>${Number(riskRow.period_effect).toFixed(2)}</b></span></div>`;
      panel.appendChild(source);
      const max=Math.max(...stages.map(d=>d.value)) * 1.14;
      stages.forEach((stage,i)=>{
        const item=document.createElement("div"); item.className=`risk-step${i<=scene.level ? " active" : ""}`;
        item.style.setProperty("--step-color",stage.color);
        const width=Math.max(7,stage.value/max*100);
        item.innerHTML=`<span class="risk-step-label">${stage.label}</span><span class="risk-step-track"><i style="width:${width}%"></i></span><strong>${riskPercent(stage.value)}</strong>`;
        panel.appendChild(item);
      });
      ui.graphic.replaceChildren(panel);
      requestAnimationFrame(()=>{if(token===runToken)panel.classList.add("is-visible");});
    }

    function aggregatePeriods(){
      const groups=new Map();
      rows.forEach(row=>{
        const group=groups.get(row.period) || {period:row.period, weight:0, base:0, age:0, cohort:0, periodEffect:0, residual:0, rd3m:0};
        const w=Number(row.loans_at_risk);
        group.weight+=w;
        group.base+=w*Number(row.risk_base);
        group.age+=w*Number(row.contribution_age);
        group.cohort+=w*Number(row.contribution_cohort);
        group.periodEffect+=w*Number(row.contribution_period);
        group.residual+=w*Number(row.contribution_residual);
        group.rd3m+=w*Number(row.rd3m);
        groups.set(row.period,group);
      });
      return [...groups.values()].sort((a,b)=>a.period.localeCompare(b.period)).map(d=>Object.fromEntries(Object.entries(d).map(([k,v])=>[k,k==="period"?v:(k==="weight"?v:v/d.weight)])));
    }

    function renderPeriodCells(token){
      const periodRows=rows.filter(r=>r.period===focalPeriod);
      const stage=document.createElement("div"); stage.className="period-cells";
      const heading=document.createElement("div"); heading.className="period-cells-heading";
      heading.innerHTML=`<span>${uiText("cells_in","Cells in")} ${monthLabel(focalPeriod)}</span><span>${uiText("weighted_by_loans","Loans weight the average")}</span>`;
      stage.appendChild(heading);
      periodRows.forEach((row,i)=>{
        const cell=document.createElement("div"); cell.className="period-cell";
        cell.innerHTML=`<strong>${uiText("age","age")} ${row.age}</strong><span>${monthLabel(row.cohort)}</span><span>${Number(row.loans_at_risk).toLocaleString("en")} ${uiText("loans_at_risk","loans")}</span><div class="period-cell-contrib"><i style="--c:#56b4e9;--w:${Math.abs(row.contribution_age)*9500}px"></i><i style="--c:#009e73;--w:${Math.abs(row.contribution_cohort)*9500}px"></i><i style="--c:#f2c66d;--w:${Math.abs(row.contribution_period)*9500}px"></i></div>`;
        stage.appendChild(cell);
        setTimeout(()=>{if(token===runToken)cell.classList.add("is-visible");},450+i*210);
      });
      const total=periodRows.reduce((s,r)=>s+Number(r.loans_at_risk),0);
      const summary=document.createElement("div"); summary.className="period-summary";
      summary.innerHTML=`<span>${total.toLocaleString("en")} ${uiText("loans_at_risk","loans")}</span><strong>${language==="es" ? "contribuciones ponderadas → un resultado para" : "weighted contributions → one"} ${monthLabel(focalPeriod)} ${language==="es" ? "" : "result"}</strong>`;
      stage.appendChild(summary);
      ui.graphic.replaceChildren(stage);
    }

    function renderContributionChart(token){
      const periods=aggregatePeriods();
      const chart=document.createElement("div"); chart.className="contribution-chart";
      const legend=document.createElement("div"); legend.className="contribution-legend";
      riskComponents.forEach(component=>{
        const item=document.createElement("span"); item.innerHTML=`<i style="background:${component.color}"></i>${componentLabel(component)}`; legend.appendChild(item);
      });
      chart.appendChild(legend);
      const max=Math.max(...periods.map(d=>Math.max(d.base,d.base+d.age,d.base+d.age+d.cohort,d.base+d.age+d.cohort+d.periodEffect,d.rd3m))) * 1.12;
      periods.forEach((period,i)=>{
        const row=document.createElement("div"); row.className="contribution-row";
        let cumulative=0;
        const steps=[period.base,period.age,period.cohort,period.periodEffect];
        const bars=steps.map((value,j)=>{const start=cumulative; cumulative+=value; return {value,start,color:riskComponents[j].color};});
        const body=document.createElement("div"); body.className="contribution-body";
        bars.forEach(bar=>{
          const segment=document.createElement("i"); segment.className="contribution-segment";
          const left=Math.min(bar.start,bar.start+bar.value)/max*100;
          segment.style.cssText=`left:${left}%;width:${Math.max(.5,Math.abs(bar.value)/max*100)}%;background:${bar.color}`;
          body.appendChild(segment);
        });
      const raw=document.createElement("b"); raw.className="raw-marker"; raw.style.left=`${period.rd3m/max*100}%`; raw.title=`${uiText("observed_rd3m","Observed RD3M")} ${riskPercent(period.rd3m)}`; body.appendChild(raw);
        row.innerHTML=`<span class="contribution-period">${monthLabel(period.period)}</span>`;
        row.appendChild(body);
        const value=document.createElement("strong"); value.textContent=riskPercent(period.rd3m); row.appendChild(value);
        chart.appendChild(row);
        setTimeout(()=>{if(token===runToken)row.classList.add("is-visible");},400+i*180);
      });
      const note=document.createElement("p"); note.className="contribution-note"; note.textContent=uiText("contributions_note","Marker: observed RD3M. Components: baseline plus sequential fitted contributions."); chart.appendChild(note);
      ui.graphic.replaceChildren(chart);
    }

    const portfolioComponents=[
      {key:"base", label:"Baseline", color:"#d8e2e9", opacity:.72},
      {key:"age_component", label:"AGE", color:"#56b4e9"},
      {key:"cohort_component", label:"COHORT", color:"#009e73"},
      {key:"period_component", label:"PERIOD", color:"#f2c66d"},
      {key:"residual_component", label:"Residual", color:"#87949d"}
    ];

    function renderPortfolioStacked(scene, token){
      const values=data.portfolio;
      const width=1020,height=650,m={t:52,r:24,b:234,l:62},w=width-m.l-m.r,h=height-m.t-m.b;
      const max=portfolioYMax;
      const min=-0.03;
      const x=i=>m.l+i*w/values.length;
      const y=v=>m.t+h-v*(h/max);
      const svg=svgNode("svg",{viewBox:`0 0 ${width} ${height}`,class:`portfolio-stack${scene.stackStep===1 ? " axis-extend" : ""}`});
      (scene.prelude ? [0,0.02,0.04,max] : [min,0,0.02,0.04,max]).forEach(v=>{const yy=y(v);svg.appendChild(svgNode("line",{x1:m.l,x2:width-m.r,y1:yy,y2:yy,class:v===0?"axis":"grid"}));const label=svgNode("text",{x:m.l-9,y:yy+4,class:"tick-label","text-anchor":"end"});label.textContent=`${(100*v).toFixed(0)}%`;svg.appendChild(label);});
      const shown=portfolioComponents.slice(0,scene.stackStep);
      const legendItems=scene.final ? [...shown,{label:"RD3M",color:"#8fc8ff"}] : shown;
      const legendWidth=legendItems.length*124;
      const legend=svgNode("g",{class:"stack-legend"});
      legendItems.forEach((component,i)=>{const xx=m.l+i*124;legend.appendChild(svgNode("circle",{cx:xx+6,cy:21,r:6,fill:component.color,"fill-opacity":component.opacity ?? 1}));const label=svgNode("text",{x:xx+18,y:25,class:"stack-legend-label"});label.textContent=componentLabel(component);legend.appendChild(label);});svg.appendChild(legend);
      const finalSegments=[];
      values.forEach((row,i)=>{
        let positive=0, negative=0;
        portfolioComponents.slice(0,scene.stackStep).forEach((component,j)=>{
          const value=Number(row[component.key]); const start=value>=0?positive:negative; const end=start+value;
          const componentOpacity=component.opacity ?? 1;
          const rect=svgNode("rect",{x:x(i)+1,y:y(Math.max(start,end)),width:Math.max(2,w/values.length-2),height:Math.max(1,Math.abs(y(end)-y(start))),fill:component.color,"fill-opacity":componentOpacity,rx:1,class:`stack-segment${scene.final||j<scene.stackStep-1?" stack-static":""}${scene.final?" stack-final-fade":""}`});
          if(scene.final)finalSegments.push({rect,opacity:.32*componentOpacity});
          if(j===scene.stackStep-1)rect.style.animationDelay=`${Math.min(800,i*10)}ms`; svg.appendChild(rect);
          if(value>=0)positive=end;else negative=end;
        });
      });
      if(scene.final || scene.prelude){
        const path=values.map((row,i)=>`${i?"L":"M"}${x(i)+w/(values.length*2)},${y(Number(row.observed_rd3m))}`).join(" ");
        svg.appendChild(svgNode("path",{d:path,fill:"none",stroke:"#8fc8ff","stroke-width":2.8,class:`reconstructed-line${scene.final?" reconstructed-final":""}`}));
      }
      const dateY=scene.prelude ? y(0)+24 : height-16;
      [0,Math.floor(values.length/4),Math.floor(values.length/2),Math.floor(values.length*3/4),values.length-1].forEach(i=>{const label=svgNode("text",{x:x(i)+w/(values.length*2),y:dateY,class:"tick-label","text-anchor":"middle"});label.textContent=monthLabel(values[i].period,true);svg.appendChild(label);});
      ui.graphic.replaceChildren(svg);
      if(scene.final)setTimeout(()=>{if(token===runToken)finalSegments.forEach(({rect,opacity})=>rect.setAttribute("fill-opacity",opacity));},250);
      if(token!==runToken)svg.remove();
    }

    function renderEffectFacets(token, animate=true){
      const values=data.portfolio;
      const width=1020,height=470,pad={l:52,r:20,t:28,b:30},gap=26,panelW=(width-pad.l-pad.r-gap)/2,panelH=(height-pad.t-pad.b-gap)/2;
      const facets=[portfolioComponents[1],portfolioComponents[2],portfolioComponents[3],portfolioComponents[4]];
      const sharedMax=Math.max(...facets.flatMap(facet=>values.map(d=>Math.abs(Number(d[facet.key])))),.001)*1.15;
      const svg=svgNode("svg",{viewBox:`0 0 ${width} ${height}`,class:"effect-facets"});
      facets.forEach((facet,index)=>{
        const col=index%2,row=Math.floor(index/2),x0=pad.l+col*(panelW+gap),y0=pad.t+row*(panelH+gap),max=sharedMax;
        const x=i=>x0+i*panelW/(values.length-1); const y=v=>y0+panelH/2-(v/max)*(panelH*.42);
        svg.appendChild(svgNode("line",{x1:x0,x2:x0+panelW,y1:y(0),y2:y(0),class:"axis"}));
        const title=svgNode("text",{x:x0,y:y0-12,class:"facet-title"});title.textContent=componentLabel(facet);title.setAttribute("fill",facet.color);svg.appendChild(title);
        const path=values.map((d,i)=>`${i?"L":"M"}${x(i)},${y(Number(d[facet.key]))}`).join(" ");const line=svgNode("path",{d:path,fill:"none",stroke:facet.color,"stroke-width":2.5,class:`facet-line${animate ? "" : " facet-static"}`,pathLength:"1"});if(animate)line.style.animationDelay=`${index*120}ms`;svg.appendChild(line);
      });
      ui.graphic.replaceChildren(svg);
      if(token!==runToken)svg.remove();
    }

    const riskTableColumns=[
      "cohort","age","period","loans_at_risk","rd3m","mu","age_effect","cohort_effect","period_effect","fitted_logit","residual_after_period",
      "risk_base","contribution_age","contribution_cohort","contribution_period","contribution_residual"
    ];
   const riskTableLabels={cohort:"Cohort",age:"Age",period:"Period",loans_at_risk:"Loans",rd3m:"RD3M",mu:"μ",age_effect:"A",cohort_effect:"C",period_effect:"P",fitted_logit:"ŷ",residual_after_period:"r⁽³⁾",risk_base:"μ′",contribution_age:"A′",contribution_cohort:"C′",contribution_period:"P′",contribution_residual:"e′"};
    const riskTableLabelsEs={...riskTableLabels,cohort:"Cohorte",age:"Edad",period:"Período",loans_at_risk:"Préstamos"};
   const riskHeaderMath={rd3m:"\\(RD3M\\)",mu:"\\(\\mu\\)",age_effect:"\\(A\\)",cohort_effect:"\\(C\\)",period_effect:"\\(P\\)",fitted_logit:"\\(\\hat y\\)",residual_after_period:"\\(r^{(3)}\\)",risk_base:"\\(\\mu'\\)",contribution_age:"\\(A'\\)",contribution_cohort:"\\(C'\\)",contribution_period:"\\(P'\\)",contribution_residual:"\\(e'\\)"};
    function riskLabel(key){return (language==="es" ? riskTableLabelsEs : riskTableLabels)[key];}
    const riskDerived=["risk_base","contribution_age","contribution_cohort","contribution_period","contribution_residual"];

    function formatRiskValue(key,value){
      if(["cohort","period"].includes(key))return monthLabel(value);
      if(["age","loans_at_risk"].includes(key))return Number(value).toLocaleString("en");
      if(["rd3m","risk_base","contribution_age","contribution_cohort","contribution_period","contribution_residual"].includes(key))return riskPercent(value);
      return Number(value).toFixed(2);
    }

    function riskActiveInputs(scene){
      return scene.colorEffects ? [] : ([[],["mu"],["mu","age_effect"],["mu","age_effect","cohort_effect"],["mu","age_effect","cohort_effect","period_effect"],["fitted_logit","rd3m"]][scene.riskStep] || []);
    }

    function riskColumnState(scene, column){
      const visible=riskTableColumns.slice(0,11+scene.riskStep);
      if(!visible.includes(column))return "hidden";
      if(scene.colorEffects)return column==="rd3m" ? "identity" : (riskDerived.includes(column) ? "effect" : (["cohort","age","period","loans_at_risk"].includes(column) ? "normal" : "dim"));
      if(riskDerived.includes(column))return column===visible[visible.length-1] ? "output" : "dim";
      if(riskActiveInputs(scene).includes(column))return "input";
      return ["rd3m","loans_at_risk","cohort","age","period"].includes(column) ? "normal" : "dim";
    }

   function riskTransitionClass(previous, scene, column){
     if(!previous || previous.mode!=="riskSheet")return null;
     const before=riskColumnState(previous,column), after=riskColumnState(scene,column);
     if(before===after || before==="hidden" || after==="hidden" || after==="output")return null;
     return {input:"column-transition-from-input",output:"column-transition-from-output",dim:"column-transition-from-dim",normal:"column-transition-from-active"}[before] || null;
   }

    function updatePersistentRiskSheet(scene, token, previous){
      const sheet=ui.graphic.querySelector(".calc-sheet.risk-scale-sheet");
      if(!sheet || previous?.mode!=="riskSheet")return false;

      const visible=riskTableColumns.slice(0,11+scene.riskStep);
      const activeInputs=riskActiveInputs(scene);
      const output=visible[visible.length-1];
      const newOutput=riskColumnState(previous,output)==="hidden" && riskColumnState(scene,output)==="output";
      const resetClasses=["future-col","new-col","input-col","dim","identity-col","risk-risk_base","risk-contribution_age","risk-contribution_cohort","risk-contribution_period","risk-contribution_residual","sheet-column-transition","column-transition-from-output","column-transition-from-input","column-transition-from-dim","column-transition-from-active"];

     riskTableColumns.forEach(column=>{
        const headerNode=sheet.querySelector(`.sheet-header [data-col='${column}']`);
        if(headerNode && !riskHeaderMath[column])headerNode.textContent=riskLabel(column);
       sheet.querySelectorAll(`[data-col='${column}']`).forEach(node=>{
          node.classList.remove(...resetClasses);
          node.style.opacity="";
          if(!visible.includes(column)){
            node.classList.add("future-col");
            return;
          }
          if(scene.colorEffects && column==="rd3m")node.classList.add("identity-col");
          else if(riskDerived.includes(column)){
            if(scene.colorEffects)node.classList.add(`risk-${column}`);
            else if(column===output)node.classList.add("new-col");
            else node.classList.add("dim");
          } else if(activeInputs.includes(column))node.classList.add("input-col");
          else if(!["rd3m","loans_at_risk","cohort","age","period"].includes(column))node.classList.add("dim");
          if(newOutput && column===output && !scene.cycle)node.style.opacity="0";
        });
      });

      if(newOutput && riskHeaderMath[output]){
        const headerNode=sheet.querySelector(`.sheet-header [data-col='${output}']`);
        if(headerNode){
          window.MathJax?.typesetClear?.([headerNode]);
          headerNode.innerHTML=riskHeaderMath[output];
          typeset(headerNode);
        }
      }

      if(newOutput && !scene.colorEffects)revealLastColumn(sheet,token,true);
      return true;
    }

   function renderRiskSheet(scene, token, previous=null){
      if(updatePersistentRiskSheet(scene,token,previous))return;
     const visible=riskTableColumns.slice(0,11+scene.riskStep);
      const activeInputs=riskActiveInputs(scene);
      const animateColumns=previous?.mode==="riskSheet";
      const stage=document.createElement("div"); stage.className="sheet-stage";
      const sheet=document.createElement("div"); sheet.className="calc-sheet risk-scale-sheet";
      const header=document.createElement("div"); header.className="sheet-row sheet-header";
     riskTableColumns.forEach(col=>{
        const node=cell(riskLabel(col),col,true);
        if(riskHeaderMath[col])node.innerHTML=riskHeaderMath[col];
       if(!visible.includes(col))node.classList.add("future-col");
        if(scene.colorEffects && col==="rd3m") node.classList.add("identity-col");
        else if(riskDerived.includes(col) && visible.includes(col)){
          if(scene.colorEffects)node.classList.add(`risk-${col}`);
          else if(col===visible[visible.length-1])node.classList.add("new-col");
          else node.classList.add("dim");
        } else if(activeInputs.includes(col)) node.classList.add("input-col");
        else if(col!=="rd3m"&&col!=="loans_at_risk"&&col!=="cohort"&&col!=="age"&&col!=="period") node.classList.add("dim");
        const transitionClass=riskTransitionClass(previous,scene,col);
        if(transitionClass)node.classList.add("sheet-column-transition",transitionClass);
        header.appendChild(node);
      });
      sheet.appendChild(header);
      rows.forEach((row,ri)=>{
        const line=document.createElement("div"); line.className="sheet-row"; line.dataset.row=ri;
        riskTableColumns.forEach(col=>{
          const node=cell(formatRiskValue(col,row[col]),col,false);
          if(!visible.includes(col))node.classList.add("future-col");
          if(scene.colorEffects && col==="rd3m") node.classList.add("identity-col");
          else if(riskDerived.includes(col) && visible.includes(col)){
            if(scene.colorEffects)node.classList.add(`risk-${col}`);
            else if(col===visible[visible.length-1])node.classList.add("new-col");
            else node.classList.add("dim");
          } else if(activeInputs.includes(col)) node.classList.add("input-col");
          else if(col!=="rd3m"&&col!=="loans_at_risk"&&col!=="cohort"&&col!=="age"&&col!=="period") node.classList.add("dim");
          const transitionClass=riskTransitionClass(previous,scene,col);
          if(transitionClass)node.classList.add("sheet-column-transition",transitionClass);
          line.appendChild(node);
        });
        sheet.appendChild(line);
      });
     stage.appendChild(sheet); ui.graphic.replaceChildren(stage);
      typeset(header);
     if(animateColumns)setTimeout(()=>{if(token===runToken)sheet.querySelectorAll(".sheet-column-transition").forEach(node=>node.classList.remove("sheet-column-transition","column-transition-from-output","column-transition-from-input","column-transition-from-dim","column-transition-from-active"));},120);
      if(scene.riskStep>0&&!scene.colorEffects)revealLastColumn(sheet,token,animateColumns);
    }

    function renderPeriodTable(token){
      const shownPeriods=new Set(data.story.periods);
      const periods=data.portfolio.filter(row=>shownPeriods.has(row.period));
      const table=document.createElement("div"); table.className="period-risk-table";
      const columns=["Period","Loans","RD3M","μ̄′","Ā′","C̄′","P̄′","ē′"];
     const header=document.createElement("div"); header.className="period-risk-row period-risk-header";
      if(language==="es"){columns[0]="Período";columns[1]="Préstamos";}
     const periodHeaderMath=[null,null,"\\(RD3M\\)","\\(\\overline{\\mu'}\\)","\\(\\overline{A'}\\)","\\(\\overline{C'}\\)","\\(\\overline{P'}\\)","\\(\\overline{e'}\\)"];
      columns.forEach((label,i)=>{const n=document.createElement("span");if(periodHeaderMath[i])n.innerHTML=periodHeaderMath[i];else n.textContent=label;header.appendChild(n);});
      table.appendChild(header);
      const ellipsis=()=>{const row=document.createElement("div");row.className="period-risk-row period-risk-ellipsis";const cell=document.createElement("span");cell.textContent="⋮";row.appendChild(cell);table.appendChild(row);};
      ellipsis();
      periods.forEach((period,i)=>{
        const row=document.createElement("div"); row.className="period-risk-row";
        const values=[monthLabel(period.period),Math.round(period.loans_at_risk).toLocaleString("en"),riskPercent(period.observed_rd3m),riskPercent(period.base),riskPercent(period.age_component),riskPercent(period.cohort_component),riskPercent(period.period_component),riskPercent(period.residual_component)];
        values.forEach((value,j)=>{const n=document.createElement("span");n.textContent=value;if(j>2)n.classList.add(["risk-risk_base","risk-contribution_age","risk-contribution_cohort","risk-contribution_period","risk-contribution_residual"][j-3]);row.appendChild(n);});
        table.appendChild(row); setTimeout(()=>{if(token===runToken)row.classList.add("is-visible");},350+i*180);
      });
     ellipsis();
     ui.graphic.replaceChildren(table);
      typeset(header);
   }

    const sheetSteps = {
      base:["cohort","age","period","loans_at_risk","defaults_3m"],
      rd3m:["cohort","age","period","loans_at_risk","defaults_3m","rd3m"],
      q:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q"],
      logit:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit"],
      mu:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu"],
      r0:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean"],
      age:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect"],
      r1:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age"],
      cohort:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect"],
      r2:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort"],
      period:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect"],
      r3:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect","residual_after_period"],
      fitted:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect","residual_after_period","fitted_logit"],
      reconstruct_logit:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect","residual_after_period","fitted_logit"],
      inverse_logit:["cohort","age","period","loans_at_risk","defaults_3m","rd3m","q","y_logit","mu","residual_after_mean","age_effect","residual_after_age","cohort_effect","residual_after_cohort","period_effect","residual_after_period","fitted_logit"]
    };

   const fullColumns=sheetSteps.fitted;
   const labels={cohort:"Cohort",age:"Age",period:"Period",loans_at_risk:"Loans",defaults_3m:"Defaults",rd3m:"RD3M",q:"q",y_logit:"logit(q)",mu:"μ",residual_after_mean:"r⁽⁰⁾",age_effect:"A",residual_after_age:"r⁽¹⁾",cohort_effect:"C",residual_after_cohort:"r⁽²⁾",period_effect:"P",residual_after_period:"r⁽³⁾",fitted_logit:"ŷ"};
    const labelsEs={...labels,cohort:"Cohorte",age:"Edad",period:"Período",loans_at_risk:"Préstamos",defaults_3m:"Defaults"};
   const headerMath={rd3m:"\\(RD3M\\)",q:"\\(q\\)",y_logit:"\\(\\operatorname{logit}(q)\\)",mu:"\\(\\mu\\)",residual_after_mean:"\\(r^{(0)}\\)",age_effect:"\\(A\\)",residual_after_age:"\\(r^{(1)}\\)",cohort_effect:"\\(C\\)",residual_after_cohort:"\\(r^{(2)}\\)",period_effect:"\\(P\\)",residual_after_period:"\\(r^{(3)}\\)",fitted_logit:"\\(\\hat y\\)"};
    function sheetLabel(key){return (language==="es" ? labelsEs : labels)[key];}

    function sheetColumnState(scene, column){
      const visible=sheetSteps[scene.step] || [];
      if(!visible.includes(column))return "hidden";
      if(scene.noColumnFocus)return "normal";
      const output=scene.output || visible[visible.length-1];
      if(scene.step!=="base" && column===output)return "output";
      if(scene.deps?.includes(column))return "input";
      return scene.step!=="base" ? "dim" : "normal";
    }

   function sheetTransitionClass(previous, scene, column){
     if(!previous || previous.mode!=="sheet" || scene.noColumnFocus)return null;
     const before=sheetColumnState(previous,column), after=sheetColumnState(scene,column);
     if(before===after || before==="hidden" || after==="hidden" || after==="output")return null;
     return {input:"column-transition-from-input",output:"column-transition-from-output",dim:"column-transition-from-dim",normal:"column-transition-from-active"}[before] || null;
   }

    function updatePersistentSheet(scene, token, previous){
      const sheet=ui.graphic.querySelector(".calc-sheet:not(.risk-scale-sheet)");
      if(!sheet || previous?.mode!=="sheet")return false;

      const visible=sheetSteps[scene.step];
      const output=scene.output || visible[visible.length-1];
      const newOutput=sheetColumnState(previous,output)==="hidden" && sheetColumnState(scene,output)==="output";
      const resetClasses=["future-col","new-col","input-col","dim","identity-col","sheet-column-transition","column-transition-from-output","column-transition-from-input","column-transition-from-dim","column-transition-from-active","filled-now"];
      const rowsInSheet=[...sheet.querySelectorAll(".sheet-row:not(.sheet-header)")];

      rowsInSheet.forEach(row=>{
        row.classList.remove("not-focus-risk-row","focus-risk-row","active-group");
        const focused=scene.focusRow && row.dataset.period===scene.focusRow.period && +row.dataset.age===scene.focusRow.age;
        if(scene.focusRow)row.classList.add(focused ? "focus-risk-row" : "not-focus-risk-row");
      });

     fullColumns.forEach(column=>{
        const headerNode=sheet.querySelector(`.sheet-header [data-col='${column}']`);
        if(headerNode && !headerMath[column])headerNode.textContent=sheetLabel(column);
       sheet.querySelectorAll(`[data-col='${column}']`).forEach(node=>{
          node.classList.remove(...resetClasses);
          node.style.opacity="";
          if(!visible.includes(column)){
            node.classList.add("future-col");
            return;
          }
          if(scene.noColumnFocus)return;
          if(scene.step!=="base" && column===output)node.classList.add(scene.identity ? "identity-col" : "new-col");
          else if(scene.deps?.includes(column))node.classList.add("input-col");
          else if(scene.step!=="base")node.classList.add("dim");
          if(newOutput && column===output && !scene.cycle)node.style.opacity="0";
        });
      });

      if(newOutput && headerMath[output]){
        const headerNode=sheet.querySelector(`.sheet-header [data-col='${output}']`);
        if(headerNode){
          window.MathJax?.typesetClear?.([headerNode]);
          headerNode.innerHTML=headerMath[output];
          typeset(headerNode);
        }
      }

      if(newOutput && !scene.cycle && !scene.identity && !scene.noColumnFocus)revealLastColumn(sheet,token,true);
      if(scene.cycle)cycleGroups(sheet,scene,output,token);
      return true;
    }

   function renderSheet(scene, token, previous=null) {
      if(updatePersistentSheet(scene,token,previous))return;
     const visible=sheetSteps[scene.step];
      const output=scene.output || visible[visible.length-1];
      const animateColumns=Boolean(previous?.mode==="sheet" && !scene.noColumnFocus);
      const stage=document.createElement("div");stage.className="sheet-stage";
      const columns=scene.columns || fullColumns;
      const sheet=document.createElement("div");sheet.className=`calc-sheet${scene.columns ? " compact-risk-sheet" : ""}`;
      const header=document.createElement("div");header.className="sheet-row sheet-header";
     columns.forEach(c=>{
        const node=cell(sheetLabel(c),c,true);
        if(headerMath[c])node.innerHTML=headerMath[c];
       if(!visible.includes(c))node.classList.add("future-col");
        if(!scene.noColumnFocus){
          if(scene.step!=="base" && c===output)node.classList.add(scene.identity ? "identity-col" : "new-col");
          else if(scene.deps?.includes(c))node.classList.add("input-col");
          else if(scene.step!=="base" && visible.includes(c))node.classList.add("dim");
        }
        const transitionClass=sheetTransitionClass(previous,scene,c);
        if(transitionClass)node.classList.add("sheet-column-transition",transitionClass);
        header.appendChild(node);
      });
      sheet.appendChild(header);

      rows.forEach((row,ri)=>{
        const r=document.createElement("div");r.className="sheet-row";r.dataset.row=ri;r.dataset.age=row.age;r.dataset.cohort=row.cohort;r.dataset.period=row.period;
        if(scene.focusRow){
          const matches=String(row.period)===scene.focusRow.period && +row.age===scene.focusRow.age;
          r.classList.add(matches ? "focus-risk-row" : "not-focus-risk-row");
        }
        columns.forEach(c=>{
          const node=cell(formatValue(c,row[c]),c,false);
          if(!visible.includes(c))node.classList.add("future-col");
          if(!scene.noColumnFocus){
            if(scene.step!=="base" && c===output)node.classList.add(scene.identity ? "identity-col" : "new-col");
            else if(scene.deps?.includes(c))node.classList.add("input-col");
            else if(scene.step!=="base" && visible.includes(c))node.classList.add("dim");
          }
          const transitionClass=sheetTransitionClass(previous,scene,c);
          if(transitionClass)node.classList.add("sheet-column-transition",transitionClass);
          r.appendChild(node);
        });
        sheet.appendChild(r);
      });

     stage.appendChild(sheet);ui.graphic.replaceChildren(stage);
      typeset(header);
     if(animateColumns){
        setTimeout(()=>{if(token===runToken)sheet.querySelectorAll(".sheet-column-transition").forEach(node=>node.classList.remove("sheet-column-transition","column-transition-from-output","column-transition-from-input","column-transition-from-dim","column-transition-from-active"));},120);
      }
      if(scene.step!=="base" && !scene.cycle && !scene.identity && !scene.noColumnFocus)revealLastColumn(sheet, token, animateColumns);
      if(scene.cycle)cycleGroups(sheet, scene, output, token);
    }

    function revealLastColumn(sheet, token, includeHeader=false){
      const selector=includeHeader ? ".new-col:not(.future-col)" : ".sheet-row:not(.sheet-header) .new-col:not(.future-col)";
      const cells=[...sheet.querySelectorAll(selector)];
      cells.forEach(c=>c.style.opacity="0");
      cells.forEach((c,i)=>setTimeout(()=>{if(token===runToken)c.style.opacity="1";},550+i*42));
    }

    function cycleGroups(sheet, scene, outCol, token){
      const introDelay=1800;
      const formulaFadeDelay=350;
      const groupHold=2500;
      const key=scene.cycle;
      const groupValues=[...new Set(rows.map(r=>String(r[key])))];
      const outputs=[...sheet.querySelectorAll(`.sheet-row:not(.sheet-header) [data-col='${outCol}']`)];
      outputs.forEach(c=>{c.style.opacity="0";});
      const generalFormula=scene.formula;
      let i=0;

      const cycle=()=>{
        if(token!==runToken)return;
        const value=groupValues[i];
        const groupRows=rows.filter(r=>String(r[key])===value);
        [...sheet.querySelectorAll(".sheet-row:not(.sheet-header)")].forEach(r=>{
          const on=r.dataset[key]===value;
          r.classList.toggle("active-group",on);
          const out=r.querySelector(`[data-col='${outCol}']`);
          if(out && on){out.style.opacity="1";out.classList.add("filled-now");}
        });

        ui.formula.classList.add("formula-fade");
        setTimeout(()=>{
          if(token!==runToken)return;
          ui.formula.innerHTML=groupFormula(scene.step,value,groupRows);
          typeset(ui.formula);
          ui.formula.classList.remove("formula-fade");
        },formulaFadeDelay);

        i+=1;
        if(i<groupValues.length){
          setTimeout(cycle,groupHold);
        } else {
          setTimeout(()=>{
            if(token!==runToken)return;
            [...sheet.querySelectorAll(".sheet-row")].forEach(r=>r.classList.remove("active-group"));
            ui.formula.classList.add("formula-fade");
            setTimeout(()=>{
              if(token!==runToken)return;
              ui.formula.innerHTML=generalFormula;
              typeset(ui.formula);
              ui.formula.classList.remove("formula-fade");
            },formulaFadeDelay);
          },groupHold);
        }
      };
      setTimeout(cycle,introDelay);
    }

    function groupFormula(step,value,groupRows){
      const spec={
        age:{symbol:"A",sub:String(value),residual:"residual_after_mean",power:"0"},
        cohort:{symbol:"C",sub:monthMath(value),residual:"residual_after_age",power:"1"},
        period:{symbol:"P",sub:monthMath(value),residual:"residual_after_cohort",power:"2"}
      }[step];
      const weighted=groupRows.map(r=>(+r.loans_at_risk)*(+r[spec.residual]));
      const numerator=weighted.reduce((a,b)=>a+b,0);
      const denominator=groupRows.reduce((a,r)=>a+(+r.loans_at_risk),0);
      const result=numerator/denominator;
      const compactTerms=(items,format)=>{
        if(items.length===0)return "";
        if(items.length===1)return format(items[0]);
        if(items.length===2)return `${format(items[0])}+${format(items[1])}`;
        return `${format(items[0])}+\\cdots+${format(items[items.length-1])}`;
      };
      const numeratorTerms=compactTerms(groupRows,r=>`${(+r.loans_at_risk).toLocaleString("en")}\\cdot${formatMath(+r[spec.residual])}`);
      const denominatorTerms=compactTerms(groupRows,r=>(+r.loans_at_risk).toLocaleString("en"));
      if (["age", "cohort", "period"].includes(step)) {
        return `\\[\\begin{aligned}
          ${spec.symbol}_{${spec.sub}} &= \\frac{${numeratorTerms}}{${denominatorTerms}} \\\\[7pt]
          &= \\frac{${formatMath(numerator)}}{${denominator.toLocaleString("en")}} \\\\[7pt]
          &= ${formatMath(result)}
        \\end{aligned}\\]`;
      }

      return `\\[${spec.symbol}_{${spec.sub}}=\\frac{${numeratorTerms}}{${denominatorTerms}}=\\frac{${formatMath(numerator)}}{${denominator.toLocaleString("en")}}=${formatMath(result)}\\]`;
    }

    function formatMath(value){return Number(value).toFixed(3);}
    function monthMath(value){const d=new Date(`${value}T00:00:00`);return `${d.toLocaleDateString("en",{month:"short"})}\\,${d.getFullYear()}`;}
    function cell(text,col,head){const n=document.createElement("div");n.className=`sheet-cell col-${col}${head?" head":""}`;n.dataset.col=col;n.textContent=text;return n;}
    function formatValue(key,value){if(key==="cohort"||key==="period")return monthLabel(value);if(key==="age"||key==="loans_at_risk"||key==="defaults_3m")return Number(value).toLocaleString("en");const v=+value;if(!Number.isFinite(v))return "—";if(["rd3m","q"].includes(key))return `${(100*v).toFixed(2)}%`;return v.toFixed(2);}
    function typeset(node){return window.MathJax?.typesetPromise ? window.MathJax.typesetPromise([node]).catch(()=>{}) : Promise.resolve();}
    function svgNode(tag,attrs={}){const n=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;}
    function monthLabel(value,short=false){
      const d=new Date(`${value}T00:00:00`);
      return d.toLocaleDateString(language==="es" ? "es-CL" : "en",short?{month:"short",year:"2-digit"}:{month:"short",year:"numeric"});
    }

    render(0);
  }
})();
</script>
