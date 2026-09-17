# Reproducible social-preview image for the RD3M APC story.
#
# Run from the repository root:
#   Rscript rd3m-apc/make-thumbnail.R
#
# The chart uses the exact portfolio-level components prepared by
# prepare-data.R. It deliberately has no labels, because index.qmd supplies
# the title and image alt text for the social card.

arguments <- commandArgs(trailingOnly = FALSE)
script_file <- sub("^--file=", "", arguments[grep("^--file=", arguments)][1])
project_dir <- dirname(normalizePath(script_file))

portfolio <- read.csv(file.path(project_dir, "data", "rd3m-portfolio.csv"))
output <- file.path(project_dir, "screenshot.png")

components <- list(
  list(key = "base", color = "#d8e2e9", alpha = 0.72),
  list(key = "age_component", color = "#56b4e9", alpha = 1),
  list(key = "cohort_component", color = "#009e73", alpha = 1),
  list(key = "period_component", color = "#f2c66d", alpha = 1),
  list(key = "residual_component", color = "#87949d", alpha = 1)
)

png(output, width = 1200, height = 630, type = "cairo")
on.exit(dev.off(), add = TRUE)

background <- "#0b1118"
grid <- "#1d2b37"
axis <- "#50606e"
n <- nrow(portfolio)

par(mar = c(0, 0, 0, 0), xaxs = "i", yaxs = "i", bg = background)
plot.new()
plot.window(xlim = c(0.35, n + 0.65), ylim = c(-0.03, 0.06))

for (value in c(-0.02, 0, 0.02, 0.04, 0.06)) {
  abline(h = value, col = if (value == 0) axis else grid, lwd = if (value == 0) 1.3 else 1)
}
for (value in seq(1, n, length.out = 8)) {
  abline(v = value, col = grid, lwd = 1)
}

for (i in seq_len(n)) {
  positive <- 0
  negative <- 0

  for (component in components) {
    value <- portfolio[[component$key]][i]
    start <- if (value >= 0) positive else negative
    end <- start + value

    rect(
      xleft = i - 0.36,
      ybottom = min(start, end),
      xright = i + 0.36,
      ytop = max(start, end),
      col = grDevices::adjustcolor(component$color, alpha.f = component$alpha),
      border = background,
      lwd = 0.65
    )

    if (value >= 0) positive <- end else negative <- end
  }
}
