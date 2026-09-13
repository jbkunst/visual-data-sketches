# setup -------------------------------------------------------------------

required_packages <- c("dplyr", "jsonlite", "lubridate", "tidyr")
missing_packages <- required_packages[!vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)]

if (length(missing_packages) > 0) {
  stop(
    "Install the required packages first: ",
    paste(missing_packages, collapse = ", "),
    call. = FALSE
  )
}

sketch_dir <- if (dir.exists("rd3m-apc")) "rd3m-apc" else "."
data_dir <- file.path(sketch_dir, "data")
cache_dir <- file.path(sketch_dir, ".cache")

dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(cache_dir, recursive = TRUE, showWarnings = FALSE)

source_commit <- "754a9f03fa74fb1182ddbd9c3c04df39acaf0425"
source_url <- paste0(
  "https://raw.githubusercontent.com/jbkunst/jbkunst.github.io/",
  source_commit,
  "/blog/posts/2026-09-12-decomposing-credit-vintages/data/bondora-apc-data.rds"
)
source_file <- file.path(cache_dir, "bondora-apc-data.rds")

if (!file.exists(source_file)) {
  download.file(source_url, source_file, mode = "wb", quiet = FALSE)
}

bondora_data <- readRDS(source_file)
loans_raw <- bondora_data$loans

# parameters --------------------------------------------------------------

country_name <- "Estonia"
cohort_from <- as.Date("2018-01-01")
cohort_to <- as.Date("2022-12-01")
max_age <- 36L
horizon_months <- 3L
max_start_age <- max_age - horizon_months + 1L

example_cohorts <- as.Date(c("2020-01-01", "2020-02-01", "2020-03-01"))
example_ages <- 1:5

# helpers -----------------------------------------------------------------

to_loan_date <- function(x) {
  if (inherits(x, "Date")) return(x)
  if (inherits(x, "POSIXt")) return(as.Date(x))
  as.Date(x, origin = "1899-12-30")
}

fit_sequential_apc <- function(cells) {
  cells <- cells |>
    dplyr::mutate(
      q = (defaults_3m + 0.5) / (loans_at_risk + 1),
      y_logit = qlogis(q)
    )

  mu_value <- weighted.mean(cells$y_logit, cells$loans_at_risk)

  cells |>
    dplyr::mutate(
      mu = mu_value,
      residual_after_mean = y_logit - mu
    ) |>
    dplyr::mutate(
      age_effect = weighted.mean(residual_after_mean, loans_at_risk),
      .by = age
    ) |>
    dplyr::mutate(
      residual_after_age = y_logit - mu - age_effect
    ) |>
    dplyr::mutate(
      cohort_effect = weighted.mean(residual_after_age, loans_at_risk),
      .by = cohort
    ) |>
    dplyr::mutate(
      residual_after_cohort = y_logit - mu - age_effect - cohort_effect
    ) |>
    dplyr::mutate(
      period_effect = weighted.mean(residual_after_cohort, loans_at_risk),
      .by = period
    ) |>
    dplyr::mutate(
      residual_after_period = y_logit - mu - age_effect - cohort_effect - period_effect,
      fitted_logit = mu + age_effect + cohort_effect + period_effect,
      fitted_rd3m = plogis(fitted_logit),
      reconstructed_q = plogis(fitted_logit + residual_after_period),
      risk_base = plogis(mu),
      risk_after_age = plogis(mu + age_effect),
      risk_after_cohort = plogis(mu + age_effect + cohort_effect),
      risk_after_period = fitted_rd3m,
      contribution_age = risk_after_age - risk_base,
      contribution_cohort = risk_after_cohort - risk_after_age,
      contribution_period = risk_after_period - risk_after_cohort,
      contribution_residual = rd3m - risk_after_period,
      reconstructed_rd3m = risk_base + contribution_age + contribution_cohort +
        contribution_period + contribution_residual
    )
}

serialize_cells <- function(x) {
  x |>
    dplyr::mutate(
      cohort = format(cohort, "%Y-%m-%d"),
      period = format(period, "%Y-%m-%d"),
      window_end_period = format(window_end_period, "%Y-%m-%d")
    )
}

serialize_effects <- function(x, date_columns = character()) {
  for (column in date_columns) {
    x[[column]] <- format(x[[column]], "%Y-%m-%d")
  }
  x
}

check_close <- function(x, tolerance = 1e-12, label = "check") {
  value <- max(abs(x), na.rm = TRUE)
  if (!is.finite(value) || value > tolerance) {
    stop(label, " failed: max difference = ", signif(value, 6), call. = FALSE)
  }
  invisible(value)
}

# loans -------------------------------------------------------------------

loans <- loans_raw |>
  dplyr::filter(country == country_name) |>
  dplyr::mutate(
    loan_date = to_loan_date(loan_issued_at),
    cohort = lubridate::floor_date(loan_date, unit = "month"),
    months_on_book = as.integer(months_on_book),
    is_default = as.logical(is_default),
    default_age = dplyr::if_else(is_default, months_on_book, NA_integer_),
    observed_age = pmin(months_on_book, max_age),
    last_start_age = dplyr::if_else(
      !is.na(default_age) & default_age <= max_age,
      pmin(default_age, max_start_age),
      pmin(observed_age - horizon_months + 1L, max_start_age)
    )
  ) |>
  dplyr::filter(
    cohort >= cohort_from,
    cohort <= cohort_to,
    observed_age >= 1L,
    last_start_age >= 1L
  ) |>
  dplyr::select(
    loan_id,
    cohort,
    default_age,
    observed_age,
    last_start_age
  )

# three-month forward windows ---------------------------------------------

loan_windows <- loans |>
  tidyr::uncount(last_start_age, .id = "age") |>
  dplyr::mutate(
    period = cohort + lubridate::period(month = age),
    window_end_period = period + lubridate::period(month = horizon_months - 1L),
    default_3m = as.integer(
      !is.na(default_age) &
        default_age >= age &
        default_age <= age + horizon_months - 1L
    )
  ) |>
  dplyr::select(
    loan_id,
    cohort,
    age,
    period,
    window_end_period,
    default_3m
  )

rd3m_cells <- loan_windows |>
  dplyr::summarise(
    loans_at_risk = dplyr::n(),
    defaults_3m = sum(default_3m),
    .by = c(cohort, age, period, window_end_period)
  ) |>
  dplyr::mutate(rd3m = defaults_3m / loans_at_risk) |>
  dplyr::arrange(cohort, age)

# full APC ----------------------------------------------------------------

apc_full <- fit_sequential_apc(rd3m_cells)

portfolio_observed <- rd3m_cells |>
  dplyr::summarise(
    loans_at_risk = sum(loans_at_risk),
    defaults_3m = sum(defaults_3m),
    .by = period
  ) |>
  dplyr::mutate(observed_rd3m = defaults_3m / loans_at_risk)

portfolio_apc <- apc_full |>
  dplyr::summarise(
    base = weighted.mean(risk_base, loans_at_risk),
    age_component = weighted.mean(contribution_age, loans_at_risk),
    cohort_component = weighted.mean(contribution_cohort, loans_at_risk),
    period_component = weighted.mean(contribution_period, loans_at_risk),
    residual_component = weighted.mean(contribution_residual, loans_at_risk),
    .by = period
  ) |>
  dplyr::mutate(
    fitted_rd3m = base + age_component + cohort_component + period_component,
    reconstructed_rd3m = fitted_rd3m + residual_component
  ) |>
  dplyr::left_join(portfolio_observed, by = "period") |>
  dplyr::arrange(period)

age_effects <- apc_full |>
  dplyr::distinct(age, age_effect) |>
  dplyr::arrange(age)

cohort_effects <- apc_full |>
  dplyr::distinct(cohort, cohort_effect) |>
  dplyr::arrange(cohort)

period_effects <- apc_full |>
  dplyr::distinct(period, period_effect) |>
  dplyr::arrange(period)

# didactic 3-cohort example -----------------------------------------------

example_cells_raw <- rd3m_cells |>
  dplyr::filter(
    cohort %in% example_cohorts,
    age %in% example_ages
  ) |>
  dplyr::arrange(cohort, age)

expected_example_rows <- length(example_cohorts) * length(example_ages)
if (nrow(example_cells_raw) != expected_example_rows) {
  stop(
    "Expected ", expected_example_rows, " example cells but found ", nrow(example_cells_raw),
    call. = FALSE
  )
}

example_apc <- fit_sequential_apc(example_cells_raw)

example_mean <- list(
  weighted_sum = sum(example_apc$y_logit * example_apc$loans_at_risk),
  weight = sum(example_apc$loans_at_risk),
  mu = dplyr::first(example_apc$mu)
)

example_age <- example_apc |>
  dplyr::summarise(
    weighted_sum = sum(residual_after_mean * loans_at_risk),
    weight = sum(loans_at_risk),
    effect = dplyr::first(age_effect),
    .by = age
  ) |>
  dplyr::arrange(age)

example_cohort <- example_apc |>
  dplyr::summarise(
    weighted_sum = sum(residual_after_age * loans_at_risk),
    weight = sum(loans_at_risk),
    effect = dplyr::first(cohort_effect),
    .by = cohort
  ) |>
  dplyr::arrange(cohort)

example_period <- example_apc |>
  dplyr::summarise(
    weighted_sum = sum(residual_after_cohort * loans_at_risk),
    weight = sum(loans_at_risk),
    effect = dplyr::first(period_effect),
    .by = period
  ) |>
  dplyr::arrange(period)

# checks ------------------------------------------------------------------

check_close(
  apc_full$q - apc_full$reconstructed_q,
  label = "Full APC logit reconstruction"
)
check_close(
  apc_full$rd3m - apc_full$reconstructed_rd3m,
  label = "Full APC RD3M reconstruction"
)
check_close(
  portfolio_apc$observed_rd3m - portfolio_apc$reconstructed_rd3m,
  label = "Portfolio RD3M reconstruction"
)
check_close(
  example_apc$q - example_apc$reconstructed_q,
  label = "Example APC logit reconstruction"
)

if (!all(rd3m_cells$period == rd3m_cells$cohort + lubridate::period(month = rd3m_cells$age))) {
  stop("APC date identity failed: period != cohort + age", call. = FALSE)
}

# exports -----------------------------------------------------------------

cells_export <- serialize_cells(apc_full)
portfolio_export <- portfolio_apc |>
  dplyr::mutate(period = format(period, "%Y-%m-%d"))

utils::write.csv(
  cells_export,
  file.path(data_dir, "rd3m-cells.csv"),
  row.names = FALSE,
  na = ""
)

utils::write.csv(
  portfolio_export,
  file.path(data_dir, "rd3m-portfolio.csv"),
  row.names = FALSE,
  na = ""
)

payload <- list(
  metadata = list(
    country = country_name,
    cohort_from = format(cohort_from, "%Y-%m-%d"),
    cohort_to = format(cohort_to, "%Y-%m-%d"),
    max_age = max_age,
    horizon_months = horizon_months,
    max_start_age = max_start_age,
    rate_definition = paste0(
      "Defaults during months a through a+", horizon_months - 1L,
      " divided by loans alive at the start of age a with an observable outcome window"
    ),
    weight = "loans_at_risk",
    link = "logit",
    correction = "q = (defaults_3m + 0.5) / (loans_at_risk + 1)",
    apc_order = c("mean", "age", "cohort", "period", "residual"),
    source_post = "https://jkunst.com/blog/posts/2026-09-12-decomposing-credit-vintages/",
    source_data = "https://goandgrow.eu/en/public-statistics/",
    source_snapshot = source_url
  ),
  example = list(
    cohorts = format(example_cohorts, "%Y-%m-%d"),
    ages = example_ages,
    rows = serialize_cells(example_apc),
    mean = example_mean,
    age = example_age,
    cohort = serialize_effects(example_cohort, "cohort"),
    period = serialize_effects(example_period, "period")
  ),
  effects = list(
    age = age_effects,
    cohort = serialize_effects(cohort_effects, "cohort"),
    period = serialize_effects(period_effects, "period")
  ),
  portfolio = portfolio_export
)

jsonlite::write_json(
  payload,
  file.path(data_dir, "rd3m-data.json"),
  pretty = TRUE,
  auto_unbox = TRUE,
  dataframe = "rows",
  digits = NA,
  na = "null"
)

message("Wrote:")
message("  ", file.path(data_dir, "rd3m-data.json"))
message("  ", file.path(data_dir, "rd3m-cells.csv"))
message("  ", file.path(data_dir, "rd3m-portfolio.csv"))
message("Checks passed: APC and portfolio reconstructions close exactly within tolerance.")
