# RD3M APC sketch instructions

These instructions apply to every change under `rd3m-apc/`.

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
- Loan-dot age-group changes use fades; default loans remain part of their age group and remain visibly red.
- The transition from the loan-dot grouping scene to the sheet is a fade.
- Prefer slower, legible transitions over rapid motion.

## Loan-dot scenes

- The loan marks represent the full denominator for the focal period, not a sample.
- In the RD3M scene, marks should visually expand from the previously selected portfolio point into the full loan field.
- Defaults are overpainted in red so the numerator remains visible on top of the denominator.
- Put the legend / current group label immediately above the loan field, not below it, and make it readable at normal desktop viewing size.
- During age-group animation, label the active group explicitly (`Loans with age 1`, `Loans with age 2`, etc.).

## Formulas and notation

- Use MathJax / LaTeX for formulas; do not use monospace pseudo-formulas.
- Keep the existing blue formula callout treatment.
- Explain subscripts when first introduced. In particular, state that `c` denotes cohort and `a` denotes age in `RD3M_{c,a}`.
- Keep formulas consistent with `prepare-data.R` and the methodological source post.
