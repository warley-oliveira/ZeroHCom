import { lazy, Suspense, useMemo, type ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  RiArrowDownCircleLine,
  RiArrowUpCircleLine,
  RiCarLine,
  RiErrorWarningLine,
  RiLineChartLine,
  RiRepeatLine,
} from "@remixicon/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatCardGrid } from "@/components/dashboard/stat-card-grid"
import { StatGridSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { ChartSkeleton } from "@/components/dashboard/chart-skeleton"
import { WidgetError } from "@/components/dashboard/widget-error"
import { InvoiceStatusCard } from "@/components/dashboard/invoice-status-card"
import { FleetRanking } from "@/components/dashboard/fleet-ranking"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardSummary } from "@/hooks/useDashboardSummary"
import { useCashflow } from "@/hooks/useCashflow"
import { useBreakdowns } from "@/hooks/useBreakdowns"
import { useActivity } from "@/hooks/useActivity"
import { usePendingConfirmations } from "@/hooks/usePendingConfirmations"
import { useFleetSummary } from "@/hooks/useFleetSummary"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DEFAULT_PRESET, defaultBucketFor, isDateRangePreset, resolvePreset } from "@/lib/dateRanges"
import type { DashboardSummary, DateRangePreset } from "@/types/dashboard"
import type { FleetSummaryRow } from "@/types/fleet-summary"

const IncomeExpenseChart = lazy(() => import("@/components/dashboard/income-expense-chart"))
const ExpenseBreakdownChart = lazy(() => import("@/components/dashboard/expense-breakdown-chart"))

interface DashboardSearch {
  // Optional so navigating to /dashboard doesn't require passing it; defaulted on read.
  preset?: DateRangePreset
}

export const Route = createFileRoute("/_authed/dashboard")({
  validateSearch: (search): DashboardSearch =>
    isDateRangePreset(search.preset) ? { preset: search.preset } : {},
  component: DashboardPage,
})

// Switches a section between error / loading / loaded, given a TanStack Query result.
function AsyncBlock<T>({
  query,
  skeleton,
  errorMessage,
  children,
}: {
  query: { data?: T; isPending: boolean; isError: boolean; refetch: () => unknown }
  skeleton: ReactNode
  errorMessage: string
  children: (data: T) => ReactNode
}) {
  if (query.isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <WidgetError message={errorMessage} onRetry={() => query.refetch()} />
        </CardContent>
      </Card>
    )
  }
  if (query.isPending || query.data === undefined) return <>{skeleton}</>
  return <>{children(query.data)}</>
}

function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const preset = Route.useSearch().preset ?? DEFAULT_PRESET
  const navigate = Route.useNavigate()
  const range = useMemo(() => resolvePreset(preset), [preset])
  const bucket = useMemo(() => defaultBucketFor(range), [range])

  const summary = useDashboardSummary(range)
  const cashflow = useCashflow(range, bucket)
  const breakdowns = useBreakdowns(range)
  const activity = useActivity()
  const pendingConfirmations = usePendingConfirmations()
  const fleet = useFleetSummary()

  const setPreset = (next: DateRangePreset) =>
    navigate({ search: (prev) => ({ ...prev, preset: next }) })

  const refresh = () => {
    summary.refetch()
    cashflow.refetch()
    breakdowns.refetch()
    activity.refetch()
    pendingConfirmations.refetch()
    fleet.refetch()
  }

  const isFetching =
    summary.isFetching ||
    cashflow.isFetching ||
    breakdowns.isFetching ||
    activity.isFetching ||
    pendingConfirmations.isFetching ||
    fleet.isFetching

  return (
    <div className="space-y-6">
      <DashboardHeader
        userName={user?.name}
        preset={preset}
        onPresetChange={setPreset}
        onRefresh={refresh}
        isFetching={isFetching}
      />

      <AsyncBlock
        query={summary}
        skeleton={<StatGridSkeleton />}
        errorMessage={t("dashboard.errors.summary")}
      >
        {(data) => <KpiRow data={data} />}
      </AsyncBlock>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AsyncBlock
            query={cashflow}
            skeleton={<ChartSkeleton />}
            errorMessage={t("dashboard.errors.cashflow")}
          >
            {(data) => (
              <Suspense fallback={<ChartSkeleton />}>
                <IncomeExpenseChart data={data} />
              </Suspense>
            )}
          </AsyncBlock>
        </div>
        <div className="lg:col-span-4">
          <AsyncBlock
            query={breakdowns}
            skeleton={<ChartSkeleton height={220} />}
            errorMessage={t("dashboard.errors.expenses")}
          >
            {(data) => (
              <Suspense fallback={<ChartSkeleton height={220} />}>
                <ExpenseBreakdownChart data={data} />
              </Suspense>
            )}
          </AsyncBlock>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AsyncBlock
            query={summary}
            skeleton={<ChartSkeleton height={240} />}
            errorMessage={t("dashboard.errors.invoices")}
          >
            {(data) => <InvoiceStatusCard data={data} />}
          </AsyncBlock>
        </div>
        <div className="lg:col-span-5">
          <AsyncBlock
            query={activity}
            skeleton={<ChartSkeleton height={320} />}
            errorMessage={t("dashboard.errors.activity")}
          >
            {(data) => (
              <RecentActivityCard
                events={data.events}
                pendingPayments={pendingConfirmations.data?.payments ?? []}
              />
            )}
          </AsyncBlock>
        </div>
      </div>

      <AsyncBlock
        query={fleet}
        skeleton={<ChartSkeleton height={300} />}
        errorMessage={t("dashboard.errors.fleetRanking")}
      >
        {(rows) => <FleetRanking rows={rows} />}
      </AsyncBlock>

      <FleetSection
        rows={fleet.data}
        isPending={fleet.isPending}
        isError={fleet.isError}
        error={fleet.error}
        onRetry={() => fleet.refetch()}
      />
    </div>
  )
}

function KpiRow({ data }: { data: DashboardSummary }) {
  const { t } = useTranslation()
  const { kpis, deltas, currency } = data
  const money = (cents: number) => formatMoney(cents, currency)
  const occupancyPct = Math.round(kpis.fleet_occupancy.rate * 100)

  return (
    <StatCardGrid>
      <StatCard
        index={0}
        label={t("dashboard.kpis.revenue")}
        value={kpis.revenue_cents}
        format={money}
        delta={{ pct: deltas.revenue_cents.delta_pct, goodWhen: "up" }}
        icon={RiArrowUpCircleLine}
        accent="success"
      />
      <StatCard
        index={1}
        label={t("dashboard.kpis.expenses")}
        value={kpis.expense_cents}
        format={money}
        delta={{ pct: deltas.expense_cents.delta_pct, goodWhen: "down" }}
        icon={RiArrowDownCircleLine}
        accent="destructive"
      />
      <StatCard
        index={2}
        label={t("dashboard.kpis.netProfit")}
        value={kpis.net_profit_cents}
        format={money}
        delta={{ pct: deltas.net_profit_cents.delta_pct, goodWhen: "up" }}
        icon={RiLineChartLine}
        accent={kpis.net_profit_cents >= 0 ? "success" : "destructive"}
      />
      <StatCard
        index={3}
        label={t("dashboard.kpis.mrr")}
        value={kpis.mrr_cents}
        format={money}
        icon={RiRepeatLine}
        accent="info"
        footer={t("dashboard.kpis.activeContracts", {
          count: kpis.active_contracts_count.toLocaleString("pt-BR"),
        })}
      />
      <StatCard
        index={4}
        label={t("dashboard.kpis.fleetOccupancy")}
        value={occupancyPct}
        format={(v) => `${v}%`}
        icon={RiCarLine}
        accent="warning"
        footer={t("dashboard.kpis.rentedOf", {
          rented: kpis.fleet_occupancy.rented,
          total: kpis.fleet_occupancy.total,
        })}
      />
      <StatCard
        index={5}
        label={t("dashboard.kpis.overdue")}
        value={kpis.overdue_cents}
        format={money}
        icon={RiErrorWarningLine}
        accent="destructive"
        footer={t("dashboard.kpis.overdueInvoices", {
          count: kpis.overdue_count.toLocaleString("pt-BR"),
        })}
      />
    </StatCardGrid>
  )
}

function FleetSection({
  rows,
  isPending,
  isError,
  error,
  onRetry,
}: {
  rows: FleetSummaryRow[] | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
}) {
  const { t } = useTranslation()
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{t("dashboard.fleet.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.fleet.subtitle")}
        </p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="p-0">
            <WidgetError
              message={t("dashboard.errors.fleet")}
              detail={error instanceof Error ? error.message : undefined}
              onRetry={onRetry}
            />
          </CardContent>
        </Card>
      ) : isPending || !rows ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("dashboard.fleet.emptyBefore")}{" "}
            <Link to="/assets" className="text-foreground underline underline-offset-4">
              {t("dashboard.fleet.emptyLink")}
            </Link>{" "}
            {t("dashboard.fleet.emptyAfter")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <FleetCard key={row.asset.id} row={row} />
          ))}
        </div>
      )}
    </section>
  )
}

function metaString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata?.[key]
  return value == null ? null : String(value)
}

function FleetCard({ row }: { row: FleetSummaryRow }) {
  const { t } = useTranslation()
  const { asset, income_cents, expense_cents, net_profit_cents, currency } = row
  const positive = net_profit_cents >= 0
  const plate = metaString(asset.metadata, "plate")
  const model = metaString(asset.metadata, "model")

  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{model ?? asset.name}</CardTitle>
            <CardDescription className="truncate">{plate ? plate : asset.name}</CardDescription>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <RiCarLine className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("dashboard.fleet.totalRevenue")}</span>
          <span className="font-medium tabular-nums text-success">
            {formatMoney(income_cents, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("dashboard.fleet.totalExpense")}</span>
          <span className="font-medium tabular-nums text-destructive">
            {formatMoney(expense_cents, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium">{t("dashboard.fleet.netProfit")}</span>
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {formatMoney(net_profit_cents, currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
