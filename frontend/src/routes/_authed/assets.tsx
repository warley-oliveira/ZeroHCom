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
import { FilterBar, FilterSearch, FilterSelect } from "@/components/filters/filters"
import { AssetFormDialog } from "@/components/assets/AssetFormDialog"
import { useAssets, useDeleteAsset } from "@/hooks/useAssets"
import { toApiError } from "@/lib/api-errors"
import { parseEnum, parsePage, parsePerPage, parseString } from "@/lib/list-search"
import type { Asset, AssetStatus } from "@/types/asset"

const ASSET_STATUSES = ["available", "rented", "maintenance"] as const

interface AssetsSearch {
  page?: number
  per_page?: number
  q?: string
  status?: AssetStatus
  asset_type?: string
}

export const Route = createFileRoute("/_authed/assets")({
  validateSearch: (search): AssetsSearch => ({
    page: parsePage(search.page),
    per_page: parsePerPage(search.per_page),
    q: parseString(search.q),
    status: parseEnum(search.status, ASSET_STATUSES),
    asset_type: parseString(search.asset_type),
  }),
  component: AssetsPage,
})

const STATUS_KEYS: Record<AssetStatus, string> = {
  available: "assets.statuses.available",
  rented: "assets.statuses.rented",
  maintenance: "assets.statuses.maintenance",
}

const STATUS_CLASSES: Record<AssetStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rented: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  maintenance: "bg-red-500/10 text-red-500 border-red-500/20",
}

// Show the first few primitive metadata entries as compact badges (e.g. "plate: XYZ").
const MAX_META_BADGES = 4

function metadataBadges(metadata: Record<string, unknown>) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && typeof value !== "object")
    .slice(0, MAX_META_BADGES)
    .map(([key, value]) => ({ key, value: String(value) }))
}

function AssetsPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useAssets(search)
  const { isLoading, isError, error, refetch, isFetching } = query
  const assets = query.data?.data ?? []
  const meta = query.data?.meta
  const deleteMutation = useDeleteAsset()

  const updateFilter = (patch: Partial<AssetsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  const goToPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) })
  const setPerPage = (per_page: number) =>
    navigate({ search: (prev) => ({ ...prev, per_page, page: undefined }) })
  const clearFilters = () => navigate({ search: {} })
  const hasActiveFilters = Boolean(search.q || search.status || search.asset_type)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditing(asset)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success(t("assets.toasts.deleted"))
      setPendingDelete(null)
    } catch (err) {
      const apiError = toApiError(err, t("assets.toasts.deleteError"))
      toast.error(apiError.message)
    }
  }

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("assets.table.name"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "asset_type",
        header: t("assets.table.type"),
        cell: ({ row }) =>
          row.original.asset_type ? (
            <Badge variant="outline">{row.original.asset_type}</Badge>
          ) : (
            <span className="text-muted-foreground">{t("common.dash")}</span>
          ),
      },
      {
        accessorKey: "status",
        header: t("assets.table.status"),
        cell: ({ row }) => (
          <Badge variant="outline" className={STATUS_CLASSES[row.original.status]}>
            {t(STATUS_KEYS[row.original.status])}
          </Badge>
        ),
      },
      {
        id: "metadata",
        header: t("assets.table.metadata"),
        cell: ({ row }) => {
          const badges = metadataBadges(row.original.metadata)
          if (badges.length === 0) {
            return <span className="text-muted-foreground">{t("common.dash")}</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {badges.map(({ key, value }) => (
                <Badge key={key} variant="outline" className="font-normal">
                  <span className="text-muted-foreground">{key}:</span>&nbsp;{value}
                </Badge>
              ))}
            </div>
          )
        },
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
              aria-label={t("assets.actions.editLabel")}
              onClick={() => openEdit(row.original)}
            >
              <RiEdit2Line />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("assets.actions.deleteLabel")}
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
            {t("assets.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("assets.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("assets.reloadLabel")}
          >
            <RiRefreshLine />
            {t("common.reload")}
          </Button>
          <Button onClick={openCreate}>
            <RiAddLine />
            {t("assets.new")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t("assets.list.title")}</CardTitle>
          <CardDescription>
            {meta ? t("assets.list.count", { count: meta.count }) : t("common.loading")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <FilterBar onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
              <FilterSearch
                value={search.q}
                onChange={(q) => updateFilter({ q })}
                placeholder={t("assets.filters.searchPlaceholder")}
                ariaLabel={t("assets.filters.searchAria")}
              />
              <FilterSelect
                value={search.status}
                onChange={(status) => updateFilter({ status: status as AssetStatus })}
                allLabel={t("assets.filters.statusAll")}
                ariaLabel={t("assets.filters.statusAria")}
                options={ASSET_STATUSES.map((status) => ({
                  value: status,
                  label: t(`assets.statuses.${status}`),
                }))}
              />
              <FilterSearch
                value={search.asset_type}
                onChange={(asset_type) => updateFilter({ asset_type })}
                placeholder={t("assets.filters.typePlaceholder")}
                ariaLabel={t("assets.filters.typeAria")}
                className="w-44"
              />
            </FilterBar>
          </div>
          {isError ? (
            <div className="space-y-2 py-8 text-center text-sm">
              <p className="text-destructive">{t("assets.list.loadError")}</p>
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
                data={assets}
                isLoading={isLoading}
                loadingState={t("assets.list.loading")}
                emptyState={hasActiveFilters ? t("common.filters.empty") : t("assets.list.empty")}
              />
              {meta ? (
                <Pagination meta={meta} onPageChange={goToPage} onPerPageChange={setPerPage} />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} asset={editing} />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assets.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t("assets.deleteDialog.description", { name: pendingDelete.name })
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
