export function formatCompactNumber(value: number) {
  if (value < 1000) {
    return String(value)
  }

  if (value < 1_000_000) {
    const compact = value / 1000
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}K`
  }

  const compact = value / 1_000_000
  return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}M`
}
