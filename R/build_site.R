# packages ---------------------------------------------------------------
library(dplyr)
library(purrr)
library(stringr)
library(tibble)
library(fs)
library(yaml)
library(cli)
library(webshot2)
library(quarto)

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

as_file_url <- function(x) {
  x <- normalizePath(x, winslash = "/", mustWork = TRUE)
  if (.Platform$OS.type == "windows") paste0("file:///", x) else paste0("file://", x)
}

configure_quarto <- function() {
  if (!is.null(quarto::quarto_path())) return(invisible(TRUE))

  candidates <- c(
    file.path(
      Sys.getenv("LOCALAPPDATA"),
      "Programs", "Positron", "resources", "app", "quarto", "bin", "quarto.exe"
    ),
    file.path(Sys.getenv("ProgramFiles"), "Quarto", "bin", "quarto.exe")
  )
  candidates <- candidates[file_exists(candidates)]

  if (length(candidates) == 0) {
    stop("Quarto CLI not found. Add it to PATH or set QUARTO_PATH.", call. = FALSE)
  }

  Sys.setenv(QUARTO_PATH = candidates[[1]])
  invisible(TRUE)
}

runtime_label <- function(x) {
  # `server` remains an alias so older DESCRIPTION files keep working.
  recode(x, server = "shiny")
}

launch_url <- function(sketch, runtime, app_url) {
  if (runtime == "html") paste0(sketch, "/") else app_url
}

write_cards <- function(sketches) {
  cards <- sketches$sketch |>
    set_names() |>
    map(function(sketch) {
      meta <- sketches |>
        filter(.data$sketch == .env$sketch) |>
        slice(1)

      screenshot <- path(sketch, "screenshot.png")
      url <- launch_url(sketch, meta$runtime, meta$app_url)

      card <- list(
        title = meta$title,
        description = meta$description,
        date = meta$date,
        categories = as.list(unique(meta$categories[[1]])),
        path = url
      )

      if (file_exists(screenshot)) {
        card$image <- chartr("\\", "/", screenshot)
      }

      card
    })

  card_order <- sketches |>
    arrange(desc(as.Date(.data$date)), .data$title) |>
    pull(.data$sketch)
  cards <- cards[card_order]

  write_yaml(unname(cards), "sketches.yml")
  cards
}

make_screenshot <- function(meta) {
  screenshot <- path(meta$sketch, "screenshot.png")
  if (file_exists(screenshot)) return(invisible(TRUE))

  url <- if (meta$runtime == "html") {
    as_file_url(path("docs", meta$sketch, "index.html"))
  } else {
    meta$app_url
  }

  cli::cli_alert_info("Screenshot: {meta$sketch}")

  tryCatch(
    {
      webshot2::webshot(
        url = url,
        file = screenshot,
        delay = 2,
        vwidth = 1440,
        vheight = 900
      )
      cli::cli_alert_success("Saved {screenshot}")
      TRUE
    },
    error = function(e) {
      cli::cli_alert_warning("{meta$sketch}: screenshot failed: {conditionMessage(e)}")
      FALSE
    }
  )
}

# find sketches ----------------------------------------------------------
cli::cli_h1("Find sketches")

sketch_dirs <- dir() |>
  keep(~ dir_exists(.x)) |>
  keep(~ file_exists(path(.x, "DESCRIPTION"))) |>
  discard(~ .x %in% c("R", "assets", "docs")) |>
  discard(~ startsWith(.x, "."))

sketches <- map_dfr(sketch_dirs, function(sketch) {
  desc <- read.dcf(path(sketch, "DESCRIPTION"))
  desc <- as.list(desc[1, , drop = TRUE])

  tibble(
    sketch = sketch,
    title = value(desc, "Title"),
    description = value(desc, "Description"),
    date = value(desc, "Date"),
    categories = list(as_csv(value(desc, "Categories"))),
    runtime = runtime_label(str_to_lower(value(desc, "Runtime", "html"))),
    app_url = value(desc, "AppURL"),
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

metadata_errors <- sketches |>
  mutate(
    missing = pmap_chr(
      list(
        .data$sketch,
        .data$title,
        .data$description,
        .data$date,
        .data$categories,
        .data$runtime,
        .data$app_url
      ),
      function(sketch, title, description, date, categories, runtime, app_url) {
        problems <- c(
          if (!nzchar(title)) "Title",
          if (!nzchar(description)) "Description",
          if (!str_detect(date, "^\\d{4}-\\d{2}-\\d{2}$") || is.na(as.Date(date))) "Date",
          if (length(categories) == 0) "Categories",
          if (!runtime %in% c("html", "shiny", "external")) "Runtime",
          if (identical(runtime, "html") && !file_exists(path(sketch, "index.qmd"))) "index.qmd",
          if (runtime %in% c("shiny", "external") && !nzchar(app_url)) "AppURL"
        )

        paste(problems, collapse = ", ")
      }
    )
  ) |>
  filter(nzchar(.data$missing))

if (nrow(metadata_errors) > 0) {
  stop(
    paste0(metadata_errors$sketch, ": missing or invalid ", metadata_errors$missing, collapse = "\n"),
    call. = FALSE
  )
}

# cards ------------------------------------------------------------------
cli::cli_h1("Gallery cards")
cards <- write_cards(sketches)
cli::cli_alert_success("Generated sketches.yml with {length(cards)} sketches.")

# quarto -----------------------------------------------------------------
cli::cli_h1("Quarto")
configure_quarto()
quarto::quarto_render(".")

# screenshots ------------------------------------------------------------
cli::cli_h1("Screenshots")
walk(seq_len(nrow(sketches)), ~ make_screenshot(sketches[.x, ]))

cards <- write_cards(sketches)
quarto::quarto_render("index.qmd")

# done -------------------------------------------------------------------
cli::cli_h1("Done")
cli::cli_alert_success("Built {nrow(sketches)} sketches.")

if (interactive()) {
  index_file <- normalizePath("docs/index.html", winslash = "/", mustWork = TRUE)

  if (.Platform$OS.type == "windows") {
    shell.exec(index_file)
  } else {
    utils::browseURL(as_file_url(index_file))
  }
}
