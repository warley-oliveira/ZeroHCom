import { Cell, Pie, PieChart } from "recharts"
import { useTranslation } from "react-i18next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CHART_PALETTE, categoryLabel } from "@/components/dashboard/dashboard-config"
import { formatMoney } from "@/lib/format"
import type { DashboardBreakdowns } from "@/types/dashboard"

const MAX_SLICES = 5

export default function ExpenseBreakdownChart({ data }: { data: DashboardBreakdowns }) {
  const { t } = useTranslation()
  const { currency } = data
  const top = data.expense_by_category.slice(0, MAX_SLICES)
  const restTotal = data.expense_by_category
    .slice(MAX_SLICES)
    .reduce((sum, slice) => sum + slice.amount_cents, 0)

  const rows = [
    ...top.map((slice, i) => ({
      key: slice.category,
      label: categoryLabel(slice.category, t),
      amount: slice.amount_cents,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    })),
    ...(restTotal > 0
      ? [{ key: "outros", label: t("dashboard.categories.other"), amount: restTotal, color: "var(--muted-foreground)" }]
      : []),
  ]
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  const config: ChartConfig = Object.fromEntries(
    rows.map((row) => [row.key, { label: row.label, color: row.color }]),
  )

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t("dashboard.expenses.title")}</CardTitle>
        <CardDescription>{t("dashboard.expenses.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {total > 0 ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <ChartContainer
                config={config}
                className="aspect-square h-[200px]"
                role="img"
                aria-label={t("dashboard.expenses.chartAriaLabel")}
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent valueFormatter={(v) => formatMoney(v, currency)} />}
                  />
                  <Pie
                    data={rows}
                    dataKey="amount"
                    nameKey="key"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {rows.map((row) => (
                      <Cell key={row.key} fill={row.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">{t("dashboard.expenses.total")}</span>
                <span className="font-heading text-base font-semibold tabular-nums">
                  {formatMoney(total, currency)}
                </span>
              </div>
            </div>
            <ul className="grid flex-1 gap-2 text-sm">
              {rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: row.color }} />
                    {row.label}
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(row.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            {t("dashboard.expenses.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
