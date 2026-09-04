# Repository instructions

## SEO for data visualizations

Apply these rules whenever creating or modifying a public visualization, visual
story, dashboard, interactive chart, table, map, Quarto page, or gallery entry.

### Content and metadata

- Give every public visualization a unique, descriptive `title` or `pagetitle`.
  Preserve custom visible headings; use `pagetitle` when `title` would create a
  duplicate title block.
- Add a page-specific `description`, a representative `image`, and useful
  `image-alt` text. Keep each description natural and specific to the subject,
  period, principal dimensions, and source.
- State what the visualization shows in a short visible introduction. Do not
  rely only on a JavaScript widget, tooltip, embedded JSON, or table to explain
  the page.
- Use search language naturally in the page title, H1, introduction, headings,
  image alt text, and links. Never add hidden SEO text, keyword lists, keyword
  stuffing, or `meta keywords`.
- Keep page language coherent and set `lang` correctly. Do not insert artificial
  bilingual keyword lists.
- Keep the corresponding `DESCRIPTION` card metadata accurate and consistent
  with the page while avoiding identical boilerplate across sketches.

### Quarto and public URLs

- Use Quarto-native metadata and project configuration instead of editing
  generated HTML.
- Canonical, Open Graph, sitemap, and internal URLs must use the public
  `https://jkunst.com` domain and the path defined by `website.site-url`.
- Keep existing published slugs stable. Use lowercase, readable,
  hyphen-separated slugs for new pages.
- Let Quarto generate `sitemap.xml`; never edit or post-process it manually
  without explicit approval.
- Important pages must be linked from the gallery through normal HTML links.
- Keep GA4 in the shared Quarto configuration. The default measurement ID is
  `G-ECZ9XLT78C`; never insert Analytics by editing generated HTML.

### Visual quality and accessibility

- Preserve the visual-first character of the project: introductions should be
  concise and informative, not generic SEO filler.
- Use one meaningful H1, a logical heading hierarchy, descriptive links, useful
  image alt text, and informative accessibility labels for interactive regions.
- Do not change data, chart behavior, JavaScript, CSS, or the visual composition
  merely to satisfy SEO metadata requirements.

### Validation before a pull request

1. Do not run the repository build automatically. Ask the user to run
   `Rscript R/build_site.R` and wait for them to share the result before
   continuing with any validation that depends on generated output.
2. Inspect generated HTML for the title, meta description, canonical link, Open
   Graph metadata, social image, correct language, and GA4 ID.
3. Confirm that visualizations, tables, navigation, CSS, and JavaScript still
   work and that important explanatory text exists in the initial HTML when the
   page architecture permits it.
4. Verify that the generated sitemap contains the expected `jkunst.com` URLs.
5. Do not commit `docs/` or `sketches.yml`; they are generated and ignored in
   this repository.
6. Review `git diff` and exclude unrelated changes. Report the deployed URLs to
   inspect in Google Search Console after the PR is merged.

A sitemap helps discovery but does not guarantee indexing or ranking. Optimize
for clear, useful content rather than attempting to manipulate search results.

## X-13 PIB de Chile

- When modifying `x13-pib-chile`, use
  `https://jkunst.com/blog/posts/2026-09-01-desestacionalizar-pib-x13/` as the
  canonical reference for the methodology, terminology, and mathematical
  notation. Resolve inconsistencies in favor of the article.
