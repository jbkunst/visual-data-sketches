# packages ---------------------------------------------------------------
library(dplyr)
library(purrr)
library(stringr)
library(tibble)
library(fs)
library(yaml)
library(cli)

# helpers ----------------------------------------------------------------
value <- function(desc, name, default = "") {
  x <- desc[[name]]
  if (is.null(x) || is.na(x) || !nzchar(x)) x <- default

  x |>
    str_replace_all("[\r\n\t]+", " ") |>
    str_squish()
}

as_csv <- function(x) {
  x <- str_squish(x)
  if (!nzchar(x)) return(character())

  x |>
    str_split(",") |>
    pluck(1) |>
    str_squish() |>
    discard(~ !nzchar(.x))
}

# find sketches ----------------------------------------------------------
cli::cli_h1("Find sketches")

sketch_dirs <- dir() |>
  keep(~ dir_exists(.x)) |>
  keep(~ file_exists(path(.x, "DESCRIPTION"))) |>
  keep(~ file_exists(path(.x, "index.qmd"))) |>
  discard(~ .x %in% c("R", "assets", "docs")) |>
  discard(~ startsWith(.x, "."))

sketches <- map_dfr(sketch_dirs, function(sketch) {
  desc <- read.dcf(path(sketch, "DESCRIPTION"))
  desc <- as.list(desc[1, , drop = TRUE])

  tibble(
    sketch = sketch,
    title = value(desc, "Title"),
    description = value(desc, "Description"),
    categories = list(as_csv(value(desc, "Categories"))),
    status = str_to_lower(value(desc, "Status"))
  )
})

if (nrow(sketches) == 0) {
  stop("No sketch DESCRIPTION files found.", call. = FALSE)
}

draft_sketches <- sketches |>
  filter(.data$status == "draft")

if (nrow(draft_sketches) > 0) {
  cli::cli_alert_info("Draft sketches skipped: {paste(draft_sketches$sketch, collapse = ', ')}")
  sketches <- sketches |>
    filter(.data$status != "draft")
}

if (nrow(sketches) == 0) {
  stop("No published sketches found.", call. = FALSE)
}

missing_metadata <- sketches |>
  mutate(
    missing = map2_chr(
      .data$title,
      .data$description,
      ~ paste(c(if (!nzchar(.x)) "Title", if (!nzchar(.y)) "Description"), collapse = ", ")
    )
  ) |>
  filter(nzchar(.data$missing))

if (nrow(missing_metadata) > 0) {
  stop(
    paste0(missing_metadata$sketch, ": missing ", missing_metadata$missing, collapse = "\n"),
    call. = FALSE
  )
}

# cards ------------------------------------------------------------------
cli::cli_h1("Gallery cards")

cards <- sketches$sketch |>
  set_names() |>
  map(function(sketch) {
    meta <- sketches |>
      filter(.data$sketch == .env$sketch) |>
      slice(1)

    screenshot <- path(sketch, "screenshot.png")

    card <- list(
      title = meta$title,
      description = meta$description,
      categories = meta$categories[[1]],
      path = paste0(sketch, "/")
    )

    if (file_exists(screenshot)) {
      card$image <- chartr("\\", "/", screenshot)
    }

    card
  })

write_yaml(unname(cards[sort(names(cards))]), "sketches.yml")
cli::cli_alert_success("Generated sketches.yml with {length(cards)} sketches.")

# quarto -----------------------------------------------------------------
cli::cli_h1("Quarto")
quarto::quarto_render(".")

# done -------------------------------------------------------------------
cli::cli_h1("Done")
cli::cli_alert_success("Built {nrow(sketches)} sketches.")

if (interactive()) {
  index_url <- paste0(
    "file:///",
    normalizePath("docs/index.html", winslash = "/", mustWork = TRUE)
  )
  utils::browseURL(index_url)
}
