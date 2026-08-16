# Visual Data Sketches

Visual sketches, stories, maps, and experiments made with data.

A small Quarto gallery for standalone visual pieces. Sketches may be static, interactive, or app-like; the only common rule is that the visual result comes first.

## Repository Structure

- `<sketch-folder>/`: one sketch per top-level folder.
- `<sketch-folder>/index.qmd`: the sketch itself.
- `<sketch-folder>/DESCRIPTION`: gallery metadata.
- `<sketch-folder>/styles.css`: optional sketch-specific style.
- `<sketch-folder>/screenshot.png`: optional gallery preview.
- `R/build_site.R`: generates the gallery metadata and renders Quarto.
- `index.qmd`: Quarto source for the gallery.
- `assets/`: styles and assets used only by the gallery.

Generated files such as `sketches.yml` and `docs/` are not source files and are not versioned.

## Sketch Metadata

Each public sketch needs a `DESCRIPTION` file:

```text
Title: Sketch title
Description: A short sentence that describes the visual piece.
Categories: maps, cars, interactive
```

The folder name is the sketch slug. Categories become the tags shown in the gallery.

Draft sketches can remain in the repository without appearing in the gallery:

```text
Status: draft
```

## Adding a New Sketch

1. Create a new top-level folder.
2. Add `index.qmd` and any sketch-specific assets or CSS.
3. Add `DESCRIPTION`.
4. Optionally add `screenshot.png` for the gallery preview.
5. Run `source("R/build_site.R")` to generate `sketches.yml` and render the site.

Each sketch should remain self-contained. It does not need to share the visual style of the gallery or of any other sketch.
