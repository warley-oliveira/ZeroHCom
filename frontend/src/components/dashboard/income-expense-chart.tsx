import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { buildCashflowChartConfig } from "@/components/dashboard/dashboard-config"
import { prefersReducedMotion } from "@/hooks/use-count-up"
import { formatBucketLabel } from "@/lib/dateRanges"
import { formatMoney } from "@/lib/format"
import type { DashboardCashflow } from "@/types/dashboard"

export default function IncomeExpenseChart({ data }: { data: DashboardCashflow }) {
  const { t } = useTranslation()
  const cashflowChartConfig = buildCashflowChartConfig(t)
  const { currency, bucket } = data
  const chartData = data.income_expense.map((point) => ({
    bucket: point.bucket,
    income: point.income_cents,
    expense: point.expense_cents,
  }))
  const hasData = chartData.some((d) => d.income !== 0 || d.expense !== 0)
  const animate = !prefersReducedMotion()

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t("dashboard.cashflow.title")}</CardTitle>
        <CardDescription>{t("dashboard.cashflow.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {hasData ? (
          <>
            <ChartContainer
              config={cashflowChartConfig}
              className="aspect-auto h-[280px] w-full"
              role="img"
              aria-label={t("dashboard.cashflow.chartAriaLabel")}
            >
            <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) => formatBucketLabel(String(value), bucket)}
              />
              <YAxis hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatBucketLabel(String(label), bucket)}
                    valueFormatter={(value) => formatMoney(value, currency)}
                  />
                }
              />
              <Area
                dataKey="income"
                type="monotone"
                stroke="var(--color-income)"
                fill="url(#fillIncome)"
                strokeWidth={2}
                isAnimationActive={animate}
              />
              <Area
                dataKey="expense"
                type="monotone"
                stroke="var(--color-expense)"
                fill="url(#fillExpense)"
                strokeWidth={2}
                isAnimationActive={animate}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>{t("dashboard.cashflow.tableCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("dashboard.cashflow.period")}</th>
                  <th scope="col">{t("dashboard.charts.income")}</th>
                  <th scope="col">{t("dashboard.charts.expense")}</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((point) => (
                  <tr key={point.bucket}>
                    <td>{formatBucketLabel(point.bucket, bucket)}</td>
                    <td>{formatMoney(point.income, currency)}</td>
                    <td>{formatMoney(point.expense, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            {t("dashboard.cashflow.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
