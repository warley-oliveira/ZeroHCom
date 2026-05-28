import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog"
import { useDeleteInvoice, useInvoices } from "@/hooks/useInvoices"
import { formatDate, formatMoney } from "@/lib/format"
import { toApiError } from "@/lib/api-errors"
import type { Invoice, InvoiceStatus } from "@/types/invoice"

export const Route = createFileRoute("/_authed/invoices")({
  component: InvoicesPage,
})

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Rascunho",
  open: "Em aberto",
  paid: "Paga",
  overdue: "Vencida",
  cancelled: "Cancelada",
}

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  open: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
}

function InvoicesPage() {
  const { data: invoices, isLoading, isError, error, refetch, isFetching } = useInvoices()
  const deleteMutation = useDeleteInvoice()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null)

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
      toast.success("Fatura excluída")
      setPendingDelete(null)
    } catch (err) {
      const apiError = toApiError(err, "Não foi possível excluir a fatura")
      toast.error(apiError.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Faturas
          </h1>
          <p className="text-sm text-muted-foreground">
            Faturas sincronizadas das integrações financeiras da organização.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Recarregar faturas"
          >
            <RiRefreshLine />
            Recarregar
          </Button>
          <Button onClick={openCreate}>
            <RiAddLine />
            Nova fatura
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Listagem</CardTitle>
          <CardDescription>
            {invoices ? `${invoices.length} fatura(s)` : "Carregando…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando faturas…
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm">
                    <div className="space-y-2">
                      <p className="text-destructive">
                        Não foi possível carregar as faturas.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {error instanceof Error ? error.message : "Erro desconhecido"}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => refetch()}>
                        Tentar novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices && invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
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
                      <Badge
                        variant="outline"
                        className={STATUS_CLASSES[invoice.status]}
                      >
                        {STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Editar fatura"
                          onClick={() => openEdit(invoice)}
                        >
                          <RiEdit2Line />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir fatura"
                          onClick={() => setPendingDelete(invoice)}
                        >
                          <RiDeleteBin6Line />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma fatura encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
            <AlertDialogTitle>Excluir fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `A fatura ${pendingDelete.external_id ?? `#${pendingDelete.id.slice(0, 8)}`} será removida permanentemente.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
