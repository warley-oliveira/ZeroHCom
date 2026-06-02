import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  RiDeleteBin6Line,
  RiEdit2Line,
  RiRefreshLine,
  RiShareLine,
  RiUserAddLine,
} from '@remixicon/react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { FilterBar, FilterSearch } from '@/components/filters/filters'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { PortalShareDialog } from '@/components/customers/PortalShareDialog'
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers'
import { toApiError } from '@/lib/api-errors'
import { parsePage, parsePerPage, parseString } from '@/lib/list-search'
import type { Customer } from '@/types/customer'

interface CustomersSearch {
  page?: number
  per_page?: number
  q?: string
}

export const Route = createFileRoute('/_authed/customers')({
  validateSearch: (search): CustomersSearch => ({
    page: parsePage(search.page),
    per_page: parsePerPage(search.per_page),
    q: parseString(search.q),
  }),
  component: ClientesPage,
})

function ClientesPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useCustomers(search)
  const { isLoading, isError, error, refetch, isFetching } = query
  const customers = query.data?.data ?? []
  const meta = query.data?.meta
  const deleteMutation = useDeleteCustomer()

  const updateFilter = (patch: Partial<CustomersSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  const goToPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) })
  const setPerPage = (per_page: number) =>
    navigate({ search: (prev) => ({ ...prev, per_page, page: undefined }) })
  const clearFilters = () => navigate({ search: {} })
  const hasActiveFilters = Boolean(search.q)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null)
  const [sharing, setSharing] = useState<Customer | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setEditing(customer)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success(t('customers.toasts.deleted'))
      setPendingDelete(null)
    } catch (err) {
      const apiError = toApiError(err, t('customers.toasts.deleteError'))
      if (apiError.code === 'customer_has_invoices') {
        toast.error(t('customers.toasts.hasInvoices'))
      } else {
        toast.error(apiError.message)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t('customers.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('customers.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t('customers.reloadAria')}
          >
            <RiRefreshLine />
            {t('common.reload')}
          </Button>
          <Button onClick={openCreate}>
            <RiUserAddLine />
            {t('customers.new')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t('customers.listTitle')}</CardTitle>
          <CardDescription>
            {meta
              ? t('customers.count', { count: meta.count })
              : t('common.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <FilterBar onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
              <FilterSearch
                value={search.q}
                onChange={(q) => updateFilter({ q })}
                placeholder={t('customers.filters.searchPlaceholder')}
                ariaLabel={t('customers.filters.searchAria')}
              />
            </FilterBar>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customers.table.name')}</TableHead>
                <TableHead>{t('customers.table.email')}</TableHead>
                <TableHead>{t('customers.table.externalId')}</TableHead>
                <TableHead className="w-28 text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {t('customers.loadingRows')}
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm">
                    <div className="space-y-2">
                      <p className="text-destructive">
                        {t('customers.loadError')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {error instanceof Error
                          ? error.message
                          : t('common.errorUnknown')}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                      >
                        {t('common.retry')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers && customers.length > 0 ? (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ?? t('common.dash')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.external_id ?? t('common.dash')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t('customers.shareAria', {
                            name: c.name,
                          })}
                          onClick={() => setSharing(c)}
                        >
                          <RiShareLine />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t('customers.editAria', { name: c.name })}
                          onClick={() => openEdit(c)}
                        >
                          <RiEdit2Line />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t('customers.deleteAria', {
                            name: c.name,
                          })}
                          onClick={() => setPendingDelete(c)}
                        >
                          <RiDeleteBin6Line />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {hasActiveFilters ? t('common.filters.empty') : t('customers.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {meta ? (
            <Pagination meta={meta} onPageChange={goToPage} onPerPageChange={setPerPage} />
          ) : null}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
      />

      <PortalShareDialog
        open={Boolean(sharing)}
        onOpenChange={(open) => !open && setSharing(null)}
        customer={sharing}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('customers.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t('customers.deleteDialog.description', {
                    name: pendingDelete.name,
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? t('common.deleting')
                : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
