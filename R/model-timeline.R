model_timeline_fields <- c(
  "model",
  "year",
  "category",
  "description",
  "image_url",
  "official_url"
)

model_timeline_adapt <- function(data, mapping, details = NULL) {
  missing_mapping <- setdiff(model_timeline_fields, names(mapping))

  if (length(missing_mapping) > 0) {
    stop(
      "Missing model timeline mappings: ",
      paste(missing_mapping, collapse = ", "),
      call. = FALSE
    )
  }

  missing_columns <- setdiff(unname(unlist(mapping)), names(data))

  if (length(missing_columns) > 0) {
    stop(
      "Mapped columns not found in source data: ",
      paste(missing_columns, collapse = ", "),
      call. = FALSE
    )
  }

  if (!is.null(details)) {
    if (is.null(names(details)) || any(!nzchar(names(details)))) {
      stop("details must be a named character vector.", call. = FALSE)
    }

    missing_detail_columns <- setdiff(unname(details), names(data))

    if (length(missing_detail_columns) > 0) {
      stop(
        "Detail columns not found in source data: ",
        paste(missing_detail_columns, collapse = ", "),
        call. = FALSE
      )
    }
  }

  adapted <- tibble::tibble(
    source_row = seq_len(nrow(data)),
    model = as.character(data[[mapping$model]]),
    year = suppressWarnings(as.integer(data[[mapping$year]])),
    category = as.character(data[[mapping$category]]),
    description = as.character(data[[mapping$description]]),
    image_url = as.character(data[[mapping$image_url]]),
    official_url = as.character(data[[mapping$official_url]])
  ) |>
    dplyr::mutate(
      description = dplyr::if_else(
        is.na(.data$description) | !nzchar(.data$description),
        "Details for this model are not available yet.",
        .data$description
      ),
      image_url = dplyr::coalesce(.data$image_url, ""),
      official_url = dplyr::coalesce(.data$official_url, ""),
      point_id = make.unique(make.names(.data$model))
    ) |>
    dplyr::arrange(.data$year, .data$model)

  if (is.null(details)) {
    adapted$specs <- vector("list", nrow(adapted))
  } else {
    adapted$specs <- lapply(adapted$source_row, function(index) {
      values <- lapply(unname(details), function(column) data[[column]][[index]])
      stats::setNames(values, names(details))
    })
  }

  adapted <- dplyr::select(adapted, -.data$source_row)

  if (nrow(adapted) == 0) {
    stop("The adapted model timeline data has no usable rows.", call. = FALSE)
  }

  adapted
}

model_timeline_initial <- function(data, initial_model) {
  index <- match(tolower(initial_model), tolower(data$model))

  if (is.na(index)) {
    stop("Initial model not found: ", initial_model, call. = FALSE)
  }

  data[index, , drop = FALSE]
}

model_timeline_hero <- function(
  data,
  initial_model,
  brand,
  link_label = "Official model page"
) {
  featured <- model_timeline_initial(data, initial_model)
  escape <- function(x, attribute = FALSE) {
    htmltools::htmlEscape(as.character(x), attribute = attribute)
  }

  image_markup <- if (nzchar(featured$image_url)) {
    sprintf(
      '<img class="model-timeline-hero-image" data-model-timeline-image src="%s" alt="%s">',
      escape(featured$image_url, TRUE),
      escape(featured$model, TRUE)
    )
  } else {
    '<div class="model-timeline-hero-image model-timeline-hero-image--empty" data-model-timeline-image></div>'
  }

  link_markup <- if (nzchar(featured$official_url)) {
    sprintf(
      paste0(
        '<a class="model-timeline-hero-link" data-model-timeline-link href="%s" ',
        'target="_blank" rel="noopener noreferrer">',
        '<span>%s</span>',
        '<span class="model-timeline-hero-link-icon" aria-hidden="true">&#8599;</span>',
        '</a>'
      ),
      escape(featured$official_url, TRUE),
      escape(link_label)
    )
  } else {
    paste0(
      '<a class="model-timeline-hero-link" data-model-timeline-link hidden>',
      sprintf('<span>%s</span>', escape(link_label)),
      '<span class="model-timeline-hero-link-icon" aria-hidden="true">&#8599;</span>',
      '</a>'
    )
  }

  paste0(
    paste0(
      '<div class="model-timeline-hero" data-model-timeline-hero ',
      'role="region" aria-label="Selected model" aria-live="polite">'
    ),
    '<div class="model-timeline-hero-media">',
    image_markup,
    sprintf(
      '<div class="model-timeline-hero-watermark" data-model-timeline-watermark>%s</div>',
      escape(featured$year)
    ),
    '</div>',
    '<div class="model-timeline-hero-copy">',
    sprintf(
      '<h2 class="model-timeline-hero-name" data-model-timeline-name>%s</h2>',
      escape(featured$model)
    ),
    '<div class="model-timeline-hero-meta">',
    sprintf(
      '<span data-model-timeline-category>%s</span>',
      escape(featured$category)
    ),
    '</div>',
    sprintf(
      '<p class="model-timeline-hero-description" data-model-timeline-description>%s</p>',
      escape(featured$description)
    ),
    link_markup,
    '</div>',
    '</div>'
  )
}

model_timeline_stack_offsets <- function(
  data,
  max_span = 0.86,
  preferred_step = 0.09
) {
  data |>
    dplyr::group_by(.data$year, .data$category) |>
    dplyr::mutate(
      y_offset = {
        models_in_year <- dplyr::n()

        if (models_in_year == 1L) {
          0
        } else {
          stack_step <- min(
            preferred_step,
            max_span / (models_in_year - 1L)
          )
          stack_position <- dplyr::row_number() - (models_in_year + 1L) / 2
          stack_position * stack_step
        }
      }
    ) |>
    dplyr::ungroup()
}

model_timeline_chart <- function(
  data,
  initial_model,
  brand,
  accent = "#e10600",
  font_family = "IBM Plex Sans",
  source_url = "",
  category_labels = NULL,
  tooltip_image_transform = identity,
  point_spacing = 0.09,
  stack_span = 0.86
) {
  category_levels <- data |>
    dplyr::count(.data$category, sort = TRUE) |>
    dplyr::pull(.data$category) |>
    rev()

  category_axis_labels <- stats::setNames(category_levels, category_levels)

  if (!is.null(category_labels)) {
    if (is.null(names(category_labels))) {
      stop("category_labels must be a named character vector.", call. = FALSE)
    }

    matched_labels <- intersect(names(category_labels), category_levels)
    category_axis_labels[matched_labels] <- category_labels[matched_labels]
  }

  initial_index <- match(tolower(initial_model), tolower(data$model))

  if (is.na(initial_index)) {
    stop("Initial model not found: ", initial_model, call. = FALSE)
  }

  initial_point_id <- data$point_id[[initial_index]]

  plot_data <- model_timeline_stack_offsets(
    data,
    max_span = stack_span,
    preferred_step = point_spacing
  )

  points <- lapply(seq_len(nrow(plot_data)), function(index) {
    row <- plot_data[index, , drop = FALSE]

    list(
      id = row$point_id,
      x = row$year,
      y = match(row$category, category_levels) - 1L + row$y_offset,
      name = row$model,
      selected = identical(row$point_id[[1]], initial_point_id),
      custom = list(
        model = row$model,
        year = row$year,
        category = row$category,
        description = row$description,
        image = row$image_url,
        tooltipImage = tooltip_image_transform(row$image_url),
        url = row$official_url,
        specs = row$specs[[1]]
      )
    )
  })

  click_handler <- htmlwidgets::JS(
    "function () {",
    "  this.select(true, false);",
    "  if (window.ModelTimeline) window.ModelTimeline.select(this);",
    "  return false;",
    "}"
  )

  tooltip_formatter <- htmlwidgets::JS(
    "function () {",
    "  const c = this.point.custom || {};",
    "  const esc = (value) => {",
    "    const node = document.createElement('span');",
    "    node.textContent = String(value ?? '');",
    "    return node.innerHTML;",
    "  };",
    "  const image = c.tooltipImage ? '<img class=\"model-timeline-tooltip-image\" src=\"' + esc(c.tooltipImage) + '\" alt=\"\" width=\"280\" height=\"158\" loading=\"eager\" fetchpriority=\"high\" decoding=\"async\">' : '';",
    "  const entries = Object.entries(c.specs || {}).filter(([key, value]) =>",
    "    value !== null && value !== undefined && String(value).trim() !== ''",
    "  );",
    "  const specs = entries.length ? '<dl class=\"model-timeline-tooltip-specs\">' + entries.map(([key, value]) =>",
    "    '<div><dt>' + esc(key) + '</dt><dd>' + esc(value) + '</dd></div>'",
    "  ).join('') + '</dl>' : '';",
    "  return '<div class=\"model-timeline-tooltip\">' + image +",
    "    '<div class=\"model-timeline-tooltip-body\">' +",
    "      '<strong>' + esc(this.point.name) + '</strong>' +",
    "      '<span class=\"model-timeline-tooltip-meta\">' + esc(c.year) + ' / ' + esc(c.category) + '</span>' +",
    "      specs +",
    "      '<small>Click for the full story</small>' +",
    "    '</div>' +",
    "  '</div>';",
    "}"
  )

  category_label_formatter <- htmlwidgets::JS(
    "function () {",
    "  const categories = this.axis.categories || [];",
    "  const valid = Number.isInteger(this.pos) && this.pos >= 0 && this.pos < categories.length;",
    "  return valid ? categories[this.pos] : '';",
    "}"
  )

  chart <- highcharter::highchart() |>
    highcharter::hc_chart(
      type = "scatter",
      backgroundColor = "transparent",
      spacing = c(18, 18, 22, 8),
      marginLeft = 145,
      zoomType = "x",
      animation = list(duration = 350),
      style = list(fontFamily = font_family)
    ) |>
    highcharter::hc_xAxis(
      title = list(text = NULL),
      min = min(data$year) - 1,
      max = max(data$year) + 1,
      tickInterval = 10,
      allowDecimals = FALSE,
      gridLineWidth = 1,
      gridLineColor = "rgba(255,255,255,0.10)",
      lineColor = "rgba(255,255,255,0.28)",
      tickColor = "rgba(255,255,255,0.28)",
      labels = list(
        style = list(
          color = "#b6b3ae",
          fontSize = "11px",
          fontFamily = font_family
        )
      )
    ) |>
    highcharter::hc_yAxis(
      categories = unname(category_axis_labels[category_levels]),
      title = list(text = ""),
      min = -0.5,
      max = length(category_levels) - 0.5,
      tickPositions = seq_along(category_levels) - 1L,
      startOnTick = FALSE,
      endOnTick = FALSE,
      gridLineWidth = 0,
      lineWidth = 0,
      labels = list(
        x = 2,
        formatter = category_label_formatter,
        style = list(
          color = "#f3f1ed",
          fontSize = "12px",
          fontFamily = font_family,
          textTransform = "uppercase",
          letterSpacing = "0.08em"
        )
      )
    ) |>
    highcharter::hc_plotOptions(
      scatter = list(
        allowPointSelect = TRUE,
        stickyTracking = FALSE,
        cursor = "pointer",
        marker = list(
          radius = 4,
          symbol = "circle",
          fillColor = "rgba(220,218,213,0.48)",
          lineColor = "rgba(255,255,255,0.42)",
          lineWidth = 1,
          states = list(
            hover = list(
              enabled = TRUE,
              radius = 7,
              fillColor = accent,
              lineColor = "#ffffff",
              lineWidth = 1.5
            ),
            select = list(
              enabled = TRUE,
              radius = 7,
              fillColor = accent,
              lineColor = "#ffffff",
              lineWidth = 2
            )
          )
        ),
        point = list(events = list(click = click_handler)),
        states = list(inactive = list(opacity = 1))
      )
    ) |>
    highcharter::hc_add_series(
      name = brand,
      data = points,
      color = accent,
      showInLegend = FALSE,
      turboThreshold = 0
    ) |>
    highcharter::hc_tooltip(
      useHTML = TRUE,
      outside = TRUE,
      followPointer = FALSE,
      animation = FALSE,
      showDelay = 0,
      hideDelay = 50,
      borderWidth = 0,
      borderRadius = 8,
      backgroundColor = "#f4f1ea",
      shadow = TRUE,
      padding = 0,
      formatter = tooltip_formatter
    ) |>
    highcharter::hc_legend(enabled = FALSE) |>
    highcharter::hc_credits(
      enabled = nzchar(source_url),
      text = "Source data",
      href = source_url,
      style = list(color = "#77736d")
    ) |>
    highcharter::hc_exporting(enabled = FALSE)

  chart
}
