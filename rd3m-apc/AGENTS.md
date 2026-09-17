# RD3M APC sketch instructions

These instructions apply to every change under `rd3m-apc/`.

## Data and validation boundaries

- `prepare-data.R` is the single source of the RD3M and sequential APC calculations. The browser renders its static outputs; it must not recreate the construction.
- Keep the pinned source snapshot unless a source update is explicitly part of the work. Preserve the input, reconstruction, and story-coverage checks when changing the data pipeline.
- After changing `prepare-data.R`, run `Rscript --vanilla rd3m-apc/prepare-data.R` from the repository root and inspect its checks before reviewing generated data. Do not overwrite unrelated local data changes.
- Read `data/README.md` and the relevant story code before changing the payload shape, calculation order, or terminology. Keep the script, payload, story, and methodological source post consistent.

## Narrative

The story must teach the calculation by executing it visually. Do not present a completed APC table and explain it afterwards.

The sequence is:

1. Portfolio RD3M line.
2. Focus one period without redrawing the line.
3. Expand that point into the underlying loans and show the RD3M numerator / denominator.
4. Reuse the same loan dots to reveal age / cohort structure.
5. Fade from dots into a fixed calculation sheet.
6. From that point on, add at most one new calculated column per scene.
7. AGE, COHORT, and PERIOD must be filled with mini-animations that show each group calculation before writing the result.

## Methodological reference

Use the source post below as the canonical reference for the methodology, terminology, and mathematical explanations in this sketch:

https://jkunst.com/blog/posts/2026-09-12-decomposing-credit-vintages/

The sketch adapts that one-month APC explanation to a three-month forward default horizon, so explanations must remain conceptually consistent with the post while using the RD3M definitions implemented in `prepare-data.R`.

In particular, keep the explanations aligned with the post for:

- why an adjusted probability `q` is needed when some cells have zero defaults;
- why the add-half correction adds `0.5` to the numerator and `1` to the denominator;
- why the decomposition moves to `logit(q)` before adding components;
- why AGE, COHORT, and PERIOD are estimated sequentially from successive residuals;
- why the final residual remains after the three systematic components are removed.

If prose, formulas, and code disagree, resolve the inconsistency in favor of the implemented RD3M calculation in `prepare-data.R`, while preserving the methodological logic of the source post.

## Fixed sheet geometry

- Once the sheet appears, `Cohort`, `Age`, and every existing column must remain at exactly the same x-position in later scenes.
- The sheet grows only to the right.
- Reserve the width of future columns from the first sheet scene using invisible slots. Future slots have no visible text, fill, or borders.
- Do not recenter the sheet when a new column appears.
- Avoid horizontal scrolling on the intended desktop viewport.

## Visual calculation grammar

This convention is mandatory in every calculation scene:

- **Blue = input columns / cells used in the current calculation.**
- **Warm orange = the new output column / cells being created in the current scene.**
- **Dim / transparent = every visible column that is not used in the current calculation.**

Do not keep `Cohort`, `Age`, or other identifier columns bright unless they are actual inputs to the calculation being demonstrated.

Examples:

- `RD3M = Defaults / Loans`: `Loans` and `Defaults` are blue; the new `RD3M` column is orange; `Cohort` and `Age` are dim.
- `q = (Defaults + 0.5) / (Loans + 1)`: `Loans` and `Defaults` are blue; `q` is orange; all other existing columns are dim.
- `logit(q)`: `q` is blue; `logit(q)` is orange; all other existing columns are dim.
- `residual0 = logit(q) - mu`: `logit(q)` and `mu` are blue; `residual0` is orange; everything else is dim.
- `AGE`: `Age`, `Loans`, and `residual0` are blue; `AGE` is orange. Cycle through each age group before leaving the scene.
- `residual1 = residual0 - AGE`: `residual0` and `AGE` are blue; `residual1` is orange.
- Apply the same rule to COHORT, residual2, PERIOD, and residual3.

## Transitions

- Scene copy (`kicker`, title, body, formula) stays anchored at the same vertical position and changes with a fade. Do not let copy length move the kicker up or down.
- Scene 2 must reuse the portfolio line visually: lower the line opacity and fade in the focal point / annotation. The focal point must not translate or drop into position.
- Loan-dot age-group changes use color / opacity transitions on the marks themselves; the full loan field must remain visible and must not fade out as a whole.
- Default loans remain part of their age group and remain visibly red.
- The transition from the loan-dot grouping scene to the sheet is a fade.
- Prefer slower, legible transitions over rapid motion.

## Narrative text

- Write scene copy to explain the statistic, calculation, assumptions, and interpretation.
- Do not describe visual implementation in the narrative: no references to colors, columns becoming bright or dim, fades, reveals, animations, or what is "shown" on screen.
- Keep visual direction in code, CSS, or these instructions; the reader-facing text must stand on its own if read without the animation.
- Do not use a symbolic variable, subscript, or indexed expression before the story has introduced and defined it. Use plain-language labels first (for example, `Age 1`), then introduce notation such as \(a\), \(c\), or \(p\) in its dedicated definition scene.
- Maintain complete English and Spanish versions of every reader-facing string: scene kickers, titles, narrative text, table headers, chart labels, legends, captions, buttons, and accessibility labels. Formulas, data values, and mathematical symbols remain shared unless mathematical language itself requires a change.
- When changing or adding reader-facing copy, update both languages in the same change. Do not leave one language as a partial translation.

### Calculation-sheet transitions

When moving between calculation-sheet scenes, including the later risk-scale sheet, preserve the table as a continuous object. Do not use a whole-table fade or an instantaneous replacement of emphasis states.

- Keep columns that remain relevant visually stable; do not reanimate them.
- Fade columns that cease to be used from their current state to the dim state.
- Preserve the actual prior header treatment during that fade. A header must not brighten briefly before becoming dim.
- Transition newly relevant input columns from neutral to blue.
- Reveal a newly calculated output column only after the input transition begins; animate its header and cells with a short, legible top-to-bottom stagger.
- Keep the grid geometry, column order, cell positions, and row order fixed throughout the transition.
- Use color, background, and opacity for transitions. Do not change font weight to signal a state change, because that change is abrupt rather than interpolated.
- Reserve bold white emphasis for an identity or final reconstructed result only; ordinary inputs and outputs rely on color and opacity.
- Sequence attention as: existing context → inputs → formula/copy → output. Allow a brief pause before the output appears.
- Cancel pending table timers when the scene changes so rapid forward/back navigation cannot reveal columns in the wrong scene.
- Prototype a transition on one adjacent scene pair before applying the same pattern broadly; the E5→E6 and E6→E7 transitions are the reference behavior.

## Loan-dot scenes

- The loan marks represent the full denominator for the focal period, not a sample.
- In the RD3M scene, marks should visually expand from the previously selected portfolio point into the full loan field.
- Defaults are overpainted in red so the numerator remains visible on top of the denominator.
- Put the legend / current group label immediately above the loan field, not below it, and make it readable at normal desktop viewing size.
- During age-group animation, label the active group explicitly (`Loans with age 1`, `Loans with age 2`, etc.).

## Formulas and notation

- Use MathJax / LaTeX for formulas; do not use monospace pseudo-formulas.
- Use compact, immediately rendered text for symbolic table headers (for example `A`, `C`, `P`, `r⁽ᵏ⁾`, and `ŷ`); keep descriptive identifiers such as `Cohort`, `Age`, and `Period` as plain text. Do not typeset table headers asynchronously.
- Prioritize pedagogical clarity and legibility over compact notation when the layout has room. Use `\\,` between symbolic factors in weighted products, and use `\\sum\\limits_{...}` when placing a grouping condition beneath a sum improves readability.
- Mathematical notation inside narrative/body text must also use inline LaTeX, for example `\\(r_i^{(0)}\\)` instead of Unicode approximations such as `residual₀`.
- Keep the existing blue formula callout treatment.
- Explain subscripts when first introduced. In particular, state that `c` denotes cohort and `a` denotes age in `RD3M_{c,a}`.
- Keep formulas consistent with `prepare-data.R` and the methodological source post.

### AGE / COHORT / PERIOD calculation scenes

- Start each scene with the general group formula.
- For each group, replace the formula with the concrete calculation being executed, e.g. `A_1 = ...`, `A_2 = ...`, or the relevant cohort / period label.
- Show the actual values being used. When the group has many rows, show the first term, `\\cdots`, and the last term, then show the full weighted numerator, denominator, and resulting value.
- Keep the relevant input rows / columns highlighted while that concrete formula is visible.
- Fill the output cells for that group only after / while its concrete calculation is shown.
- During these internal group cycles, keep the kicker, title, and body fixed; only the formula callout should fade between concrete calculations.
- Slow these scenes down relative to simple row-wise residual scenes.
- After the final group is filled, return to the general formula before the user advances.
