# TODO

## Pokémon generational scrollytelling

Create a colorful, full-viewport story driven entirely by a Pokémon CSV.

Initial direction:

- Build it as a standalone Quarto HTML sketch, not Shiny.
- Prepare all metrics and Highcharter charts in R.
- Use full-height sticky sections with native CSS Scroll Snap.
- Use a small JavaScript scene controller for chart reflow, transitions, and active-section state.
- Keep a future Shinylive explorer separate from the guided story.
- Evaluate fullPage.js or pagePiling.js only if the native prototype cannot produce a required transition.

Candidate chapters:

1. **Generation I: 151** — a full-screen opening visualization, with the count calculated from the data.
2. **A world of types** — distribution and visual identity of Pokémon types.
3. **Every journey starts with three** — starters across generations.
4. **Growing means changing** — evolution families and stages.
5. **From 151 onward** — cumulative Pokédex growth by generation.
6. **Explore the Pokédex** — optional standalone Shinylive experience.

Next step: inspect the CSV fields, validate which chapters are supported by the available data, and turn the outline into a five-scene storyboard.
