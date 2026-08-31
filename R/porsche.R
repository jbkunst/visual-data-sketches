porsche_value <- function(value, suffix = "", digits = 0) {
  if (length(value) == 0 || is.na(value)) return(NA_character_)

  formatted <- formatC(
    as.numeric(value),
    format = "f",
    digits = digits,
    big.mark = ","
  )

  paste0(formatted, suffix)
}

porsche_prepare <- function(data) {
  prepared <- data |>
    dplyr::transmute(
      model = stringr::str_remove(.data$model, "^Porsche\\s+"),
      year = suppressWarnings(as.integer(.data$year)),
      power = suppressWarnings(as.numeric(.data$max_power_cv)),
      engine = dplyr::coalesce(as.character(.data$engine), "Architecture not listed"),
      engine_position = dplyr::coalesce(as.character(.data$engine_position), "not listed"),
      architecture = dplyr::case_when(
        .data$engine_position == "rear" ~ paste("Rear-engine", .data$engine, sep = " / "),
        .data$engine_position == "mid" ~ paste("Mid-engine", .data$engine, sep = " / "),
        .data$engine_position == "front" ~ paste("Front-engine", .data$engine, sep = " / "),
        TRUE ~ .data$engine
      ),
      category = dplyr::recode(
        as.character(.data$category),
        "Porsche 911 Model Guides" = "911 Models",
        "Porsche Boxster & Cayman Model Guides" = "Boxster & Cayman Models",
        "The Rest of the Porsche Model Guides" = "Misc Models",
        "Porsche Supercar Model Guides" = "Supercars",
        "Porsche Concept Car Guides" = "Concept Cars",
        "Porsche Race Car Guides" = "Race Cars"
      ),
      description = as.character(.data$description),
      image_url = dplyr::coalesce(
        as.character(.data$image_url),
        as.character(.data$image_profile_url),
        ""
      ),
      tooltip_image_url = dplyr::coalesce(
        as.character(.data$image_profile_url),
        as.character(.data$image_url),
        ""
      ),
      official_url = dplyr::coalesce(as.character(.data$url), ""),
      displacement = suppressWarnings(as.numeric(.data$displacement_cc)),
      torque = suppressWarnings(as.numeric(.data$torque_nm)),
      top_speed = suppressWarnings(as.numeric(.data$top_speed_kmh)),
      acceleration = suppressWarnings(as.numeric(.data$acceleration_0_100_kmh_s)),
      production = suppressWarnings(as.numeric(.data$production_qty))
    ) |>
    dplyr::mutate(
      description = dplyr::if_else(
        is.na(.data$description) | !nzchar(.data$description),
        "Details for this model are not available yet.",
        .data$description
      ),
      point_id = make.unique(make.names(.data$model)),
      specs = purrr::pmap(
        list(
          .data$architecture,
          .data$engine,
          .data$displacement,
          .data$power,
          .data$torque,
          .data$top_speed,
          .data$acceleration,
          .data$production
        ),
        function(architecture, engine, displacement, power, torque, top_speed, acceleration, production) {
          stats::setNames(
            list(
              architecture,
              engine,
              porsche_value(displacement, " cc"),
              porsche_value(power, " cv"),
              porsche_value(torque, " Nm"),
              porsche_value(top_speed, " km/h"),
              porsche_value(acceleration, " s", 1),
              porsche_value(production)
            ),
            c("Layout", "Engine", "Displacement", "Power", "Torque", "Top speed", "0–100 km/h", "Production")
          )
        }
      )
    ) |>
    dplyr::arrange(.data$year, .data$power, .data$model)

  if (nrow(prepared) == 0) {
    stop("The Porsche dataset has no rows.", call. = FALSE)
  }

  prepared
}

porsche_chart <- function(
  data,
  initial_model,
  source_url,
  font_family = "IBM Plex Sans"
) {
  initial_index <- match(tolower(initial_model), tolower(data$model))

  if (is.na(initial_index)) {
    stop("Initial model not found: ", initial_model, call. = FALSE)
  }

  initial_point_id <- data$point_id[[initial_index]]
  display_order <- c(
    "911 Models",
    "Boxster & Cayman Models",
    "Misc Models",
    "Supercars",
    "Concept Cars",
    "Race Cars"
  )
  category_levels <- rev(display_order)
  category_labels <- c(
    "911 Models" = "911 Models",
    "Boxster & Cayman Models" = "Boxster & Cayman",
    "Misc Models" = "Misc Models",
    "Supercars" = "Supercars",
    "Concept Cars" = "Concept Cars",
    "Race Cars" = "Race Cars"
  )

  plot_data <- data |>
    dplyr::group_by(.data$year, .data$category) |>
    dplyr::mutate(
      y_offset = if (dplyr::n() == 1L) {
        0
      } else {
        seq(-0.32, 0.32, length.out = dplyr::n())
      }
    ) |>
    dplyr::ungroup()

  points <- lapply(seq_len(nrow(plot_data)), function(index) {
    row <- plot_data[index, , drop = FALSE]

    list(
      id = row$point_id,
      x = row$year,
      y = match(row$category, category_levels) - 1L + row$y_offset,
      name = row$model,
      color = "rgba(64,66,66,0.52)",
      selected = identical(row$point_id[[1]], initial_point_id),
      custom = list(
        model = row$model,
        year = row$year,
        category = row$category,
        description = row$description,
        image = row$image_url,
        tooltipImage = row$tooltip_image_url,
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
    "  const image = c.tooltipImage ? '<img class=\"model-timeline-tooltip-image\" src=\"' + esc(c.tooltipImage) + '\" alt=\"\" width=\"280\" height=\"158\" loading=\"eager\" decoding=\"async\">' : '';",
    "  const entries = Object.entries(c.specs || {}).filter(([key, value]) =>",
    "    value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== 'NA'",
    "  );",
    "  const specs = entries.length ? '<dl class=\"model-timeline-tooltip-specs\">' + entries.map(([key, value]) =>",
    "    '<div><dt>' + esc(key) + '</dt><dd>' + esc(value) + '</dd></div>'",
    "  ).join('') + '</dl>' : '';",
    "  return '<div class=\"model-timeline-tooltip\">' + image +",
    "    '<div class=\"model-timeline-tooltip-body\">' +",
    "      '<strong>' + esc(this.point.name) + '</strong>' +",
    "      '<span class=\"model-timeline-tooltip-meta\">' + esc(c.year) + ' / ' + esc(c.category) + '</span>' +",
    "      specs +",
    "      '<small>Click to inspect the model</small>' +",
    "    '</div>' +",
    "  '</div>';",
    "}"
  )

  highcharter::highchart() |>
    highcharter::hc_chart(
      type = "scatter",
      backgroundColor = "transparent",
      spacing = c(30, 18, 18, 8),
      marginLeft = 142,
      zoomType = "x",
      animation = list(duration = 280),
      style = list(fontFamily = font_family)
    ) |>
    highcharter::hc_xAxis_multiples(
      list(
        title = list(text = ""),
        min = min(data$year) - 1,
        max = max(data$year) + 1,
        tickInterval = 10,
        allowDecimals = FALSE,
        gridLineWidth = 1,
        gridLineDashStyle = "Dot",
        gridLineColor = "rgba(0,0,0,0.09)",
        lineWidth = 0,
        tickLength = 0,
        crosshair = list(
          color = "rgba(17,18,18,0.34)",
          dashStyle = "ShortDot",
          width = 1,
          zIndex = 3,
          snap = FALSE
        ),
        labels = list(
          y = 18,
          style = list(color = "#55595a", fontSize = "11px", fontFamily = font_family)
        )
      ),
      list(
        linkedTo = 0,
        opposite = TRUE,
        tickInterval = 10,
        allowDecimals = FALSE,
        gridLineWidth = 0,
        lineWidth = 0,
        tickLength = 0,
        labels = list(
          y = -7,
          style = list(
            color = "rgba(23,24,24,0.58)",
            fontSize = "10px",
            fontFamily = font_family
          )
        )
      )
    ) |>
    highcharter::hc_yAxis(
      categories = unname(category_labels[category_levels]),
      title = list(text = ""),
      min = -0.5,
      max = length(category_levels) - 0.5,
      tickPositions = seq_along(category_levels) - 1L,
      startOnTick = FALSE,
      endOnTick = FALSE,
      gridLineWidth = 0,
      lineWidth = 0,
      labels = list(
        x = -2,
        style = list(
          color = "#171818",
          fontSize = "11px",
          fontWeight = "600",
          fontFamily = font_family,
          textTransform = "uppercase",
          letterSpacing = "0.06em"
        )
      )
    ) |>
    highcharter::hc_plotOptions(
      scatter = list(
        allowPointSelect = TRUE,
        stickyTracking = FALSE,
        cursor = "pointer",
        marker = list(
          radius = 3.4,
          symbol = "circle",
          fillColor = "rgba(64,66,66,0.52)",
          lineColor = "rgba(255,255,255,0.76)",
          lineWidth = 0.7,
          states = list(
            hover = list(
              enabled = TRUE,
              radius = 6.5,
              fillColor = "#050505",
              lineColor = "#ffffff",
              lineWidth = 1.5
            ),
            select = list(
              enabled = TRUE,
              radius = 7,
              fillColor = "#050505",
              lineColor = "#ffffff",
              lineWidth = 2
            )
          )
        ),
        point = list(events = list(click = click_handler)),
        states = list(inactive = list(opacity = 0.18))
      )
    ) |>
    highcharter::hc_add_series(
      name = "Porsche",
      data = points,
      color = "#333535",
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
      borderRadius = 2,
      backgroundColor = "#ffffff",
      shadow = TRUE,
      padding = 0,
      formatter = tooltip_formatter
    ) |>
    highcharter::hc_legend(enabled = FALSE) |>
    highcharter::hc_credits(
      enabled = TRUE,
      text = "Stuttcars model research",
      href = source_url,
      style = list(color = "#6b6e6f")
    ) |>
    highcharter::hc_exporting(enabled = FALSE)
}
