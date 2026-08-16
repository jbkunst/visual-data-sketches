# Visual Data Sketches

Visual sketches, stories, maps, and experiments made with data.

A small Quarto gallery for standalone visual pieces. Sketches may be static, interactive, or app-like; the only common rule is that the visual result comes first.

## Repository Structure

- `<sketch-folder>/`: one sketch per top-level folder.
- `<sketch-folder>/DESCRIPTION`: gallery metadata and runtime configuration.
- `<sketch-folder>/index.qmd`: source for HTML sketches.
- `<sketch-folder>/styles.css`: optional sketch-specific style.
- `<sketch-folder>/screenshot.png`: gallery preview.
- `R/build_site.R`: builds metadata, screenshots, and the Quarto site.
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

HTML is the default runtime:

```text
Runtime: html
```

HTML sketches need an `index.qmd` in their folder.

For a Shiny app hosted externally:

```text
Runtime: server
AppURL: https://example.share.connect.posit.cloud/
```

Server sketches link directly to `AppURL` and receive the generated `runtime-server` gallery tag.

Draft sketches can remain in the repository without appearing in the gallery:

```text
Status: draft
```

## Adding a New Sketch

1. Create a new top-level folder.
2. Add `DESCRIPTION`.
3. For HTML sketches, add `index.qmd` and any sketch-specific assets or CSS.
4. For server sketches, add `Runtime: server` and `AppURL`.
5. Run `source("R/build_site.R")`.
6. Check the generated `screenshot.png` and commit it with the sketch.

The build reuses an existing `screenshot.png`. If one is missing, it captures the rendered HTML sketch or the server `AppURL` with `webshot2` at 1440 x 900.

Each sketch should remain self-contained. It does not need to share the visual style of the gallery or of any other sketch.
