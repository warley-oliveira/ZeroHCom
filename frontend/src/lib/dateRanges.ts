import type { Bucket, DateRange, DateRangePreset } from "@/types/dashboard"

// Preset ids (logic values) — UI labels are resolved via i18n at render time.
export const PRESET_ORDER: DateRangePreset[] = [
  "ultimos_7_dias",
  "ultimos_30_dias",
  "ultimos_90_dias",
  "este_mes",
  "mes_passado",
  "este_ano",
]

export const DEFAULT_PRESET: DateRangePreset = "ultimos_30_dias"

export function isDateRangePreset(value: unknown): value is DateRangePreset {
  return typeof value === "string" && (PRESET_ORDER as string[]).includes(value)
}

/** Local-date yyyy-mm-dd (avoids the UTC off-by-one of toISOString). */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Resolve a preset to a concrete inclusive {from,to} range. */
export function resolvePreset(preset: DateRangePreset, now: Date = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case "ultimos_7_dias":
      return { from: toISODate(addDays(today, -6)), to: toISODate(today) }
    case "ultimos_30_dias":
      return { from: toISODate(addDays(today, -29)), to: toISODate(today) }
    case "ultimos_90_dias":
      return { from: toISODate(addDays(today, -89)), to: toISODate(today) }
    case "este_mes":
      return {
        from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toISODate(today),
      }
    case "mes_passado": {
      const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastOfPrevMonth = addDays(firstOfThisMonth, -1)
      const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1)
      return { from: toISODate(firstOfPrevMonth), to: toISODate(lastOfPrevMonth) }
    }
    case "este_ano":
      return { from: toISODate(new Date(today.getFullYear(), 0, 1)), to: toISODate(today) }
  }
}

/** Pick a sensible bucket granularity given the range span. */
export function defaultBucketFor(range: DateRange): Bucket {
  const from = new Date(`${range.from}T00:00:00`)
  const to = new Date(`${range.to}T00:00:00`)
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (days <= 31) return "day"
  if (days <= 120) return "week"
  return "month"
}

/** Format an API bucket label for chart axes (pt-BR). */
export function formatBucketLabel(bucket: string, granularity: Bucket): string {
  // Month buckets arrive as "yyyy-mm".
  if (granularity === "month") {
    const [y, m] = bucket.split("-").map(Number)
    if (y && m) {
      const d = new Date(y, m - 1, 1)
      return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(d)
    }
  }
  // Day/week buckets arrive as ISO dates.
  const d = new Date(`${bucket}T00:00:00`)
  if (Number.isNaN(d.getTime())) return bucket
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d)
}
