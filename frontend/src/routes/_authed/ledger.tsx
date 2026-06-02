import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { RiArrowDownLine, RiArrowUpLine, RiRefreshLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Pagination } from "@/components/ui/pagination"
import { FilterBar, FilterDate, FilterSearch, FilterSelect } from "@/components/filters/filters"
import { useTransactions } from "@/hooks/useTransactions"
import { useAssetOptions } from "@/hooks/useAssets"
import { formatDate, formatMoney } from "@/lib/format"
import { parseEnum, parsePage, parsePerPage, parseString } from "@/lib/list-search"
import { cn } from "@/lib/utils"
import type { Transaction, TransactionDirection } from "@/types/transaction"

const DIRECTIONS = ["income", "expense"] as const
const SOURCE_TYPES = ["Invoice", "Payment", "Asset", "Agreement"] as const

interface LedgerSearch {
  page?: number
  per_page?: number
  direction?: TransactionDirection
  category?: string
  asset_id?: string
  source_type?: string
  date_from?: string
  date_to?: string
}

export const Route = createFileRoute("/_authed/ledger")({
  validateSearch: (search): LedgerSearch => ({
    page: parsePage(search.page),
    per_page: parsePerPage(search.per_page),
    direction: parseEnum(search.direction, DIRECTIONS),
    category: parseString(search.category),
    asset_id: parseString(search.asset_id),
    source_type: parseEnum(search.source_type, SOURCE_TYPES),
    date_from: parseString(search.date_from),
    date_to: parseString(search.date_to),
  }),
  component: LedgerPage,
})

function DirectionCell({ direction }: { direction: TransactionDirection }) {
  const { t } = useTranslation()
  const isIncome = direction === "income"
  const Icon = isIncome ? RiArrowUpLine : RiArrowDownLine
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        isIncome ? "text-emerald-500" : "text-red-500",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {isIncome ? t("ledger.direction.income") : t("ledger.direction.expense")}
    </span>
  )
}

function LedgerPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useTransactions(search)
  const assetsQuery = useAssetOptions()
  const { isLoading, isError, error, refetch, isFetching } = query
  const transactions = query.data?.data ?? []
  const meta = query.data?.meta

  const updateFilter = (patch: Partial<LedgerSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  const goToPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) })
  const setPerPage = (per_page: number) =>
    navigate({ search: (prev) => ({ ...prev, per_page, page: undefined }) })
  const clearFilters = () => navigate({ search: {} })
  const hasActiveFilters = Boolean(
    search.direction ||
      search.category ||
      search.asset_id ||
      search.source_type ||
      search.date_from ||
      search.date_to,
  )

  const assetOptions = (assetsQuery.data ?? []).map((asset) => ({ value: asset.id, label: asset.name }))

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("ledger.table.headers.date"),
        cell: ({ row }) => (row.original.date ? formatDate(row.original.date) : t("common.dash")),
      },
      {
        id: "direction",
        header: t("ledger.table.headers.direction"),
        cell: ({ row }) => <DirectionCell direction={row.original.direction} />,
      },
      {
        accessorKey: "category",
        header: t("ledger.table.headers.category"),
        cell: ({ row }) => <span className="font-medium">{row.original.category}</span>,
      },
      {
        id: "source",
        header: t("ledger.table.headers.source"),
        cell: ({ row }) =>
          row.original.source ? (
            <span className="text-xs text-muted-foreground">{row.original.source.type}</span>
          ) : (
            <span className="text-muted-foreground">{t("common.dash")}</span>
          ),
      },
      {
        id: "amount",
        header: t("ledger.table.headers.amount"),
        meta: { headerClassName: "text-right", cellClassName: "text-right tabular-nums" },
        cell: ({ row }) => (
          <span className={row.original.direction === "income" ? "text-emerald-500" : "text-red-500"}>
            {row.original.direction === "income" ? "+" : "−"}
            {formatMoney(row.original.amount_cents, row.original.currency)}
          </span>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("ledger.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("ledger.subtitle")}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label={t("ledger.reloadAria")}
        >
          <RiRefreshLine />
          {t("common.reload")}
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t("ledger.card.title")}</CardTitle>
          <CardDescription>
            {meta ? t("ledger.card.count", { count: meta.count }) : t("common.loading")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <FilterBar onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
              <FilterSelect
                value={search.direction}
                onChange={(direction) => updateFilter({ direction: direction as TransactionDirection })}
                allLabel={t("ledger.filters.directionAll")}
                ariaLabel={t("ledger.filters.directionAria")}
                options={[
                  { value: "income", label: t("ledger.direction.income") },
                  { value: "expense", label: t("ledger.direction.expense") },
                ]}
              />
              <FilterSearch
                value={search.category}
                onChange={(category) => updateFilter({ category })}
                placeholder={t("ledger.filters.categoryPlaceholder")}
                ariaLabel={t("ledger.filters.categoryAria")}
                className="w-44"
              />
              <FilterSelect
                value={search.asset_id}
                onChange={(asset_id) => updateFilter({ asset_id })}
                allLabel={t("ledger.filters.assetAll")}
                ariaLabel={t("ledger.filters.assetAria")}
                options={assetOptions}
              />
              <FilterSelect
                value={search.source_type}
                onChange={(source_type) => updateFilter({ source_type })}
                allLabel={t("ledger.filters.sourceAll")}
                ariaLabel={t("ledger.filters.sourceAria")}
                options={SOURCE_TYPES.map((type) => ({
                  value: type,
                  label: t(`ledger.filters.sources.${type}`),
                }))}
              />
              <FilterDate
                value={search.date_from}
                onChange={(date_from) => updateFilter({ date_from })}
                ariaLabel={t("ledger.filters.dateFromAria")}
              />
              <FilterDate
                value={search.date_to}
                onChange={(date_to) => updateFilter({ date_to })}
                ariaLabel={t("ledger.filters.dateToAria")}
              />
            </FilterBar>
          </div>
          {isError ? (
            <div className="space-y-2 py-8 text-center text-sm">
              <p className="text-destructive">{t("ledger.error.load")}</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : t("common.errorUnknown")}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={transactions}
                isLoading={isLoading}
                loadingState={t("ledger.table.loading")}
                emptyState={hasActiveFilters ? t("common.filters.empty") : t("ledger.table.empty")}
              />
              {meta ? (
                <Pagination meta={meta} onPageChange={goToPage} onPerPageChange={setPerPage} />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
