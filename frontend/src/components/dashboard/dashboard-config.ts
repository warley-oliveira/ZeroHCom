import type { TFunction } from "i18next"

import type { ChartConfig } from "@/components/ui/chart"
import type { InvoiceStatus } from "@/types/invoice"

// Categorical palette for donut/bar slices.
export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

// Build the cashflow chart config with translated series labels (chart-1 = income, chart-2 = expense).
export const buildCashflowChartConfig = (t: TFunction): ChartConfig => ({
  income: { label: t("dashboard.charts.income"), color: "var(--chart-1)" },
  expense: { label: t("dashboard.charts.expense"), color: "var(--chart-2)" },
})

// Known expense/income category keys (logic ids stay in English; only the label is translated).
const CATEGORY_KEYS = new Set([
  "fuel",
  "tolls",
  "maintenance",
  "insurance",
  "registration",
  "cleaning",
  "car_rental",
  "uber_income",
  "didi_income",
  "ride_share_bonus",
  "delivery_income",
])

export const categoryLabel = (key: string, t: TFunction): string =>
  CATEGORY_KEYS.has(key) ? t(`dashboard.categories.${key}`) : key

export const invoiceStatusLabel = (status: InvoiceStatus, t: TFunction): string =>
  t(`dashboard.invoiceStatus.${status}`)

export const agingLabel = (bucket: string, t: TFunction): string =>
  t(`dashboard.aging.${bucket}`)

// Status → CSS color token (used for bars/dots; pair with text labels for a11y).
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "var(--muted-foreground)",
  open: "var(--info)",
  paid: "var(--success)",
  overdue: "var(--destructive)",
  cancelled: "var(--border)",
}
