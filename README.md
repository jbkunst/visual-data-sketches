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
Categories: motorsport
```

The folder name is the sketch slug. Categories become the tags shown in the gallery and should describe the subject—such as `motorsport`, `cities`, or `music`—rather than the technology or interaction format.

HTML is the default runtime:

```text
Runtime: html
```

HTML sketches need an `index.qmd` in their folder.

For a Shiny app:

```text
Runtime: shiny
AppURL: https://example.share.connect.posit.cloud/
```

`AppURL` may be an absolute URL or a path relative to the published site, so an app can live on another host or below the same domain. Runtime is routing metadata and is not shown as a gallery category. `Runtime: server` remains accepted as a backwards-compatible alias.

For a visualization hosted outside this Quarto project:

```text
Runtime: external
AppURL: https://example.com/visualization/
```

Every gallery card opens in a new tab, whether its destination is local, Shiny, or external.

Draft sketches can remain in the repository without appearing in the gallery:

```text
Status: draft
```

## Adding a New Sketch

1. Create a new top-level folder.
2. Add `DESCRIPTION`.
3. For HTML sketches, add `index.qmd` and any sketch-specific assets or CSS.
4. For Shiny or externally hosted sketches, add the corresponding `Runtime` and `AppURL`.
5. Run `source("R/build_site.R")`.
6. Check the generated `screenshot.png` and commit it with the sketch.

The build reuses an existing `screenshot.png`. If one is missing, it captures the rendered HTML sketch or `AppURL` with `webshot2` at 1440 x 900.

Each sketch should remain self-contained. It does not need to share the visual style of the gallery or of any other sketch.

## Publishing

GitHub Pages is deployed automatically by `.github/workflows/pages.yml` whenever a commit reaches `main`. The workflow installs R and Quarto, runs `R/build_site.R`, uploads `docs/` as a Pages artifact, and deploys it.

In the repository settings, **Pages > Build and deployment > Source** must be set to **GitHub Actions**. A deployment can also be started manually from **Actions > Deploy website to GitHub Pages > Run workflow**.
