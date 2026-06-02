import { Fragment, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEdit2Line,
  RiRefreshLine,
  RiTimeLine,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { FilterBar, FilterDate, FilterSearch, FilterSelect } from "@/components/filters/filters"
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog"
import {
  useConfirmPayment,
  useDeleteInvoice,
  useInvoices,
  useRejectPayment,
} from "@/hooks/useInvoices"
import { useCustomerOptions } from "@/hooks/useCustomers"
import { useAgreementOptions } from "@/hooks/useAgreements"
import { agreementOptionLabel } from "@/lib/agreement-display"
import { formatDate, formatMoney } from "@/lib/format"
import { toApiError } from "@/lib/api-errors"
import { parseEnum, parsePage, parsePerPage, parseString } from "@/lib/list-search"
import type { Invoice, InvoiceKind, InvoiceStatus } from "@/types/invoice"

const INVOICE_STATUSES = ["draft", "open", "paid", "overdue", "cancelled"] as const
const INVOICE_KINDS = ["rent", "bond"] as const

interface InvoicesSearch {
  page?: number
  per_page?: number
  q?: string
  status?: InvoiceStatus
  kind?: InvoiceKind
  customer_id?: string
  agreement_id?: string
  due_from?: string
  due_to?: string
}

export const Route = createFileRoute("/_authed/invoices")({
  validateSearch: (search): InvoicesSearch => ({
    page: parsePage(search.page),
    per_page: parsePerPage(search.per_page),
    q: parseString(search.q),
    status: parseEnum(search.status, INVOICE_STATUSES),
    kind: parseEnum(search.kind, INVOICE_KINDS),
    customer_id: parseString(search.customer_id),
    agreement_id: parseString(search.agreement_id),
    due_from: parseString(search.due_from),
    due_to: parseString(search.due_to),
  }),
  component: InvoicesPage,
})

const METHOD_KEYS: Record<string, string> = {
  stripe: "invoices.methods.stripe",
  payid: "invoices.methods.payid",
  bank_transfer: "invoices.methods.bank_transfer",
}

const STATUS_KEYS: Record<InvoiceStatus, string> = {
  draft: "invoices.statuses.draft",
  open: "invoices.statuses.open",
  paid: "invoices.statuses.paid",
  overdue: "invoices.statuses.overdue",
  cancelled: "invoices.statuses.cancelled",
}

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  open: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
}

function InvoicesPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useInvoices(search)
  const customersQuery = useCustomerOptions()
  const agreementsQuery = useAgreementOptions()
  const { isLoading, isError, error, refetch, isFetching } = query
  const invoices = query.data?.data ?? []
  const meta = query.data?.meta
  const deleteMutation = useDeleteInvoice()
  const confirmPayment = useConfirmPayment()
  const rejectPayment = useRejectPayment()
  const reviewBusy = confirmPayment.isPending || rejectPayment.isPending

  const updateFilter = (patch: Partial<InvoicesSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  const goToPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) })
  const setPerPage = (per_page: number) =>
    navigate({ search: (prev) => ({ ...prev, per_page, page: undefined }) })
  const clearFilters = () => navigate({ search: {} })
  const hasActiveFilters = Boolean(
    search.q ||
      search.status ||
      search.kind ||
      search.customer_id ||
      search.agreement_id ||
      search.due_from ||
      search.due_to,
  )

  const customerOptions = (customersQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))
  const agreementOptions = (agreementsQuery.data ?? []).map((a) => ({
    value: a.id,
    label: agreementOptionLabel(a),
  }))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null)

  const handleConfirmPayment = async (invoiceId: string, paymentId: string) => {
    try {
      await confirmPayment.mutateAsync({ invoiceId, paymentId })
      toast.success(t("invoices.toasts.paymentConfirmed"))
    } catch (err) {
      toast.error(toApiError(err, t("invoices.toasts.paymentConfirmError")).message)
    }
  }

  const handleRejectPayment = async (invoiceId: string, paymentId: string) => {
    try {
      await rejectPayment.mutateAsync({ invoiceId, paymentId })
      toast.success(t("invoices.toasts.paymentRejected"))
    } catch (err) {
      toast.error(toApiError(err, t("invoices.toasts.paymentRejectError")).message)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success(t("invoices.toasts.deleted"))
      setPendingDelete(null)
    } catch (err) {
      const apiError = toApiError(err, t("invoices.toasts.deleteError"))
      toast.error(apiError.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("invoices.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("invoices.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("invoices.reloadAria")}
          >
            <RiRefreshLine />
            {t("common.reload")}
          </Button>
          <Button onClick={openCreate}>
            <RiAddLine />
            {t("invoices.new")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t("invoices.list.title")}</CardTitle>
          <CardDescription>
            {meta ? t("invoices.list.count", { count: meta.count }) : t("common.loading")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <FilterBar onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
              <FilterSearch
                value={search.q}
                onChange={(q) => updateFilter({ q })}
                placeholder={t("invoices.filters.searchPlaceholder")}
                ariaLabel={t("invoices.filters.searchAria")}
              />
              <FilterSelect
                value={search.status}
                onChange={(status) => updateFilter({ status: status as InvoiceStatus })}
                allLabel={t("invoices.filters.statusAll")}
                ariaLabel={t("invoices.filters.statusAria")}
                options={INVOICE_STATUSES.map((status) => ({
                  value: status,
                  label: t(`invoices.statuses.${status}`),
                }))}
              />
              <FilterSelect
                value={search.kind}
                onChange={(kind) => updateFilter({ kind: kind as InvoiceKind })}
                allLabel={t("invoices.filters.kindAll")}
                ariaLabel={t("invoices.filters.kindAria")}
                options={INVOICE_KINDS.map((kind) => ({
                  value: kind,
                  label: t(`invoices.filters.kinds.${kind}`),
                }))}
              />
              <FilterSelect
                value={search.customer_id}
                onChange={(customer_id) => updateFilter({ customer_id })}
                allLabel={t("invoices.filters.customerAll")}
                ariaLabel={t("invoices.filters.customerAria")}
                options={customerOptions}
              />
              <FilterSelect
                value={search.agreement_id}
                onChange={(agreement_id) => updateFilter({ agreement_id })}
                allLabel={t("invoices.filters.agreementAll")}
                ariaLabel={t("invoices.filters.agreementAria")}
                options={agreementOptions}
              />
              <FilterDate
                value={search.due_from}
                onChange={(due_from) => updateFilter({ due_from })}
                ariaLabel={t("invoices.filters.dueFromAria")}
              />
              <FilterDate
                value={search.due_to}
                onChange={(due_to) => updateFilter({ due_to })}
                ariaLabel={t("invoices.filters.dueToAria")}
              />
            </FilterBar>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoices.table.customer")}</TableHead>
                <TableHead className="text-right">{t("invoices.table.amount")}</TableHead>
                <TableHead>{t("invoices.table.dueDate")}</TableHead>
                <TableHead>{t("invoices.table.status")}</TableHead>
                <TableHead className="w-28 text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {t("invoices.loading")}
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm">
                    <div className="space-y-2">
                      <p className="text-destructive">
                        {t("invoices.loadError")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {error instanceof Error ? error.message : t("common.errorUnknown")}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => refetch()}>
                        {t("common.retry")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <Fragment key={invoice.id}>
                    <TableRow>
                      <TableCell>
                        <div className="font-medium">{invoice.customer.name}</div>
                        {invoice.customer.email ? (
                          <div className="text-xs text-muted-foreground">
                            {invoice.customer.email}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(invoice.amount_cents, invoice.currency)}
                      </TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={STATUS_CLASSES[invoice.status]}
                          >
                            {t(STATUS_KEYS[invoice.status])}
                          </Badge>
                          {invoice.pending_payments.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/20 bg-amber-500/10 text-amber-500"
                            >
                              <RiTimeLine />
                              {t("invoices.pendingPayment.badge")}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("invoices.editAria")}
                            onClick={() => openEdit(invoice)}
                          >
                            <RiEdit2Line />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("invoices.deleteAria")}
                            onClick={() => setPendingDelete(invoice)}
                          >
                            <RiDeleteBin6Line />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {invoice.pending_payments.map((p) => (
                      <TableRow key={p.id} className="bg-amber-500/5 hover:bg-amber-500/5">
                        <TableCell colSpan={5} className="py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm">
                              <span className="font-medium">{t("invoices.pendingPayment.reportedByCustomer")}</span>{" "}
                              <span className="text-muted-foreground">
                                {METHOD_KEYS[p.method] ? t(METHOD_KEYS[p.method]) : p.method} ·{" "}
                                {formatMoney(p.amount_cents, p.currency)} · {formatDate(p.payment_date)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reviewBusy}
                                onClick={() => handleRejectPayment(invoice.id, p.id)}
                              >
                                <RiCloseLine />
                                {t("invoices.pendingPayment.reject")}
                              </Button>
                              <Button
                                size="sm"
                                disabled={reviewBusy}
                                onClick={() => handleConfirmPayment(invoice.id, p.id)}
                              >
                                <RiCheckLine />
                                {t("invoices.pendingPayment.confirm")}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {hasActiveFilters ? t("common.filters.empty") : t("invoices.empty")}
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

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={editing}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invoices.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t("invoices.deleteDialog.description", {
                    ref: pendingDelete.external_id ?? `#${pendingDelete.id.slice(0, 8)}`,
                  })
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
