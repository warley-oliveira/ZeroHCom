import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
  RiAddLine,
  RiDeleteBin6Line,
  RiEdit2Line,
  RiRefreshLine,
} from "@remixicon/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
import { FilterBar, FilterSelect } from "@/components/filters/filters"
import { AgreementFormDialog } from "@/components/agreements/AgreementFormDialog"
import { useAgreements, useDeleteAgreement } from "@/hooks/useAgreements"
import { useCustomerOptions } from "@/hooks/useCustomers"
import { useAssetOptions } from "@/hooks/useAssets"
import { agreementStatusClass } from "@/lib/agreement-display"
import { formatMoney } from "@/lib/format"
import { toApiError } from "@/lib/api-errors"
import { parseEnum, parsePage, parsePerPage, parseString } from "@/lib/list-search"
import type { Agreement, AgreementBondFilter, AgreementStatus } from "@/types/agreement"

const AGREEMENT_STATUSES = ["active", "cancelled", "paused"] as const
const BILLING_CYCLES = ["weekly", "monthly"] as const
const BOND_FILTERS = ["required", "paid", "pending"] as const

interface AgreementsSearch {
  page?: number
  per_page?: number
  status?: AgreementStatus
  billing_cycle?: string
  customer_id?: string
  asset_id?: string
  bond?: AgreementBondFilter
}

export const Route = createFileRoute("/_authed/agreements")({
  validateSearch: (search): AgreementsSearch => ({
    page: parsePage(search.page),
    per_page: parsePerPage(search.per_page),
    status: parseEnum(search.status, AGREEMENT_STATUSES),
    billing_cycle: parseEnum(search.billing_cycle, BILLING_CYCLES),
    customer_id: parseString(search.customer_id),
    asset_id: parseString(search.asset_id),
    bond: parseEnum(search.bond, BOND_FILTERS),
  }),
  component: AgreementsPage,
})

function AgreementsPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useAgreements(search)
  const customersQuery = useCustomerOptions()
  const assetsQuery = useAssetOptions()
  const { isLoading, isError, error, refetch, isFetching } = query
  const agreements = query.data?.data ?? []
  const meta = query.data?.meta
  const deleteMutation = useDeleteAgreement()

  const updateFilter = (patch: Partial<AgreementsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  const goToPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) })
  const setPerPage = (per_page: number) =>
    navigate({ search: (prev) => ({ ...prev, per_page, page: undefined }) })
  const clearFilters = () => navigate({ search: {} })
  const hasActiveFilters = Boolean(
    search.status || search.billing_cycle || search.customer_id || search.asset_id || search.bond,
  )

  const customerOptions = (customersQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))
  const assetOptions = (assetsQuery.data ?? []).map((a) => ({ value: a.id, label: a.name }))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Agreement | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Agreement | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (agreement: Agreement) => {
    setEditing(agreement)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success(t("agreements.toasts.deleted"))
      setPendingDelete(null)
    } catch (err) {
      const apiError = toApiError(err, t("agreements.toasts.deleteError"))
      toast.error(apiError.message)
    }
  }

  const columns = useMemo<ColumnDef<Agreement>[]>(
    () => [
      {
        id: "customer",
        header: t("agreements.table.headers.customer"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customer.name}</div>
            {row.original.customer.email ? (
              <div className="text-xs text-muted-foreground">{row.original.customer.email}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "asset",
        header: t("agreements.table.headers.asset"),
        cell: ({ row }) =>
          row.original.asset ? (
            row.original.asset.name
          ) : (
            <span className="text-muted-foreground">{t("common.dash")}</span>
          ),
      },
      {
        accessorKey: "billing_cycle",
        header: t("agreements.table.headers.cycle"),
        cell: ({ row }) => {
          const cycle = row.original.billing_cycle
          if (!cycle) return <span className="text-muted-foreground">{t("common.dash")}</span>
          return t(`agreements.cycle.${cycle}`)
        },
      },
      {
        id: "amount",
        header: t("agreements.table.headers.amount"),
        meta: { headerClassName: "text-right", cellClassName: "text-right tabular-nums" },
        cell: ({ row }) => formatMoney(row.original.amount_cents, row.original.currency),
      },
      {
        id: "bond",
        header: t("agreements.table.headers.bond"),
        meta: { headerClassName: "text-right", cellClassName: "text-right tabular-nums" },
        cell: ({ row }) =>
          row.original.bond_amount_cents > 0 ? (
            <span className="inline-flex items-center justify-end gap-1.5">
              {formatMoney(row.original.bond_amount_cents, row.original.currency)}
              <Badge
                variant="outline"
                className={
                  row.original.bond_paid
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                }
              >
                {row.original.bond_paid
                  ? t("agreements.bond.paid")
                  : t("agreements.bond.pending")}
              </Badge>
            </span>
          ) : (
            <span className="text-muted-foreground">{t("common.dash")}</span>
          ),
      },
      {
        accessorKey: "status",
        header: t("agreements.table.headers.status"),
        cell: ({ row }) => (
          <Badge variant="outline" className={agreementStatusClass(row.original.status)}>
            {t(`agreements.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("common.actions"),
        meta: { headerClassName: "w-28 text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("agreements.actions.editAria")}
              onClick={() => openEdit(row.original)}
            >
              <RiEdit2Line />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("agreements.actions.deleteAria")}
              onClick={() => setPendingDelete(row.original)}
            >
              <RiDeleteBin6Line />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("agreements.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("agreements.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("agreements.reloadAria")}
          >
            <RiRefreshLine />
            {t("common.reload")}
          </Button>
          <Button onClick={openCreate}>
            <RiAddLine />
            {t("agreements.new")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t("agreements.listing")}</CardTitle>
          <CardDescription>
            {meta ? t("agreements.count", { count: meta.count }) : t("common.loading")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <FilterBar onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
              <FilterSelect
                value={search.status}
                onChange={(status) => updateFilter({ status: status as AgreementStatus })}
                allLabel={t("agreements.filters.statusAll")}
                ariaLabel={t("agreements.filters.statusAria")}
                options={AGREEMENT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`agreements.status.${status}`),
                }))}
              />
              <FilterSelect
                value={search.billing_cycle}
                onChange={(billing_cycle) => updateFilter({ billing_cycle })}
                allLabel={t("agreements.filters.cycleAll")}
                ariaLabel={t("agreements.filters.cycleAria")}
                options={BILLING_CYCLES.map((cycle) => ({
                  value: cycle,
                  label: t(`agreements.cycle.${cycle}`),
                }))}
              />
              <FilterSelect
                value={search.customer_id}
                onChange={(customer_id) => updateFilter({ customer_id })}
                allLabel={t("agreements.filters.customerAll")}
                ariaLabel={t("agreements.filters.customerAria")}
                options={customerOptions}
              />
              <FilterSelect
                value={search.asset_id}
                onChange={(asset_id) => updateFilter({ asset_id })}
                allLabel={t("agreements.filters.assetAll")}
                ariaLabel={t("agreements.filters.assetAria")}
                options={assetOptions}
              />
              <FilterSelect
                value={search.bond}
                onChange={(bond) => updateFilter({ bond: bond as AgreementBondFilter })}
                allLabel={t("agreements.filters.bondAll")}
                ariaLabel={t("agreements.filters.bondAria")}
                options={BOND_FILTERS.map((bond) => ({
                  value: bond,
                  label: t(`agreements.filters.bonds.${bond}`),
                }))}
              />
            </FilterBar>
          </div>
          {isError ? (
            <div className="space-y-2 py-8 text-center text-sm">
              <p className="text-destructive">{t("agreements.loadError")}</p>
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
                data={agreements}
                isLoading={isLoading}
                loadingState={t("agreements.loadingList")}
                emptyState={hasActiveFilters ? t("common.filters.empty") : t("agreements.empty")}
              />
              {meta ? (
                <Pagination meta={meta} onPageChange={goToPage} onPerPageChange={setPerPage} />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <AgreementFormDialog open={formOpen} onOpenChange={setFormOpen} agreement={editing} />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("agreements.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t("agreements.deleteDialog.description", { name: pendingDelete.customer.name })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
