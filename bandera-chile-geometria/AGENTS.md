# Bandera de la Independencia — story conventions

This folder is a self-contained visual story. Keep the construction faithful to the 18-step appendix supplied by the user.

## Copy hierarchy

Each scene uses the same editorial hierarchy:

1. **Eyebrow** — only `Paso N`. Never show `de 18` in the eyebrow.
2. **Title** — a short description of the geometric action. Use inline LaTeX for point, segment and angle notation (for example `\\(P\\)`, `\\(T_1O\\)`, `\\angle AOS_1`).
3. **Main text** — follow the wording and order of the user-provided book excerpt as closely as practical. Keep this concise; it says what the step asks the reader to construct.
4. **Identity** — the prominent mathematical relation for the scene, rendered in the `.formula` block.
5. **Small detail text** — pedagogical explanation below the identity. Explain why the construction works, which points are auxiliary, and what the compass/ruler operation is doing. Do not replace the book instruction with this detail.

All mathematical notation in titles, body text, notes and identities must be rendered by MathJax.

## Animation

- One book step equals one story scene.
- Re-entering a scene must replay its active construction from the beginning.
- Draw the active geometry progressively; do not reveal a partial path and then snap to a different final stroke style.
- Dashed guide/compass marks may fade in; solid segments should grow smoothly from their starting point.
- Current animation timing is intentionally about 25% slower than the original draft.
- Auxiliary geometry may be vivid while it is being used, but at the end of a scene it should fade down.
- The final state of a scene should emphasize the geometric objects associated with that scene's **identity**. Add an `identity` list and `settleDelay` when implementing this behavior for additional scenes.
- Step 2 is the reference implementation: auxiliary `U,V,X` and compass arcs fade, while the geometry behind `AP=AM=AB/2` remains prominent.

## Camera

Keep camera changes motivated by the construction:
- close on the star/left module for the early construction,
- open enough to include `Q` and the horizontal extensions when needed,
- zoom out for `P_1,P_2,P_3`,
- use a clean final framing for the colored flag.

Do not add panel borders or a separate drawing-card background; text and geometry should read as one continuous whiteboard surface.


## Compass animation grammar

Compass operations should look like a physical compass operation, not like a generic fade.

- Before a compass sweep, show the radius when it helps explain the construction. A dotted radius should grow from the active center to the starting point.
- A circumference or arc must be drawn progressively from a visible starting point, as if the compass were rotating around its fixed center.
- Emphasize the active compass center while the arc is being drawn. Remove that emphasis when the sweep ends.
- When a sweep creates or reaches a named point, reveal that point at the moment the rotating construction reaches it, not at the beginning of the scene.
- Prefer arcs over full circles when the geometric operation is only transferring a known length from one ray to another.
- Use full circles when the actual construction depends on circle-circle or circle-line intersections.
- This grammar is global: apply it to midpoint arcs, transferred lengths, circle intersections, the Q1 construction, and the star circle whenever the compass is the mathematical operation being explained.
- Step 2 is the primary reference: start with existing AB, grow dotted AU, sweep the A-centered circle from U through V and back to U, then use U and V as highlighted centers for the arcs that determine X.
