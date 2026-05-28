import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/forms/FormField"
import { useCustomers } from "@/hooks/useCustomers"
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/useInvoices"
import { toApiError } from "@/lib/api-errors"
import type { Invoice, InvoiceStatus } from "@/types/invoice"

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "open", label: "Em aberto" },
  { value: "paid", label: "Paga" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
]

const SUPPORTED_CURRENCIES = ["AUD", "BRL", "USD", "EUR", "GBP"] as const

const invoiceSchema = z
  .object({
    customer_id: z.string().min(1, "Selecione um cliente"),
    status: z.enum(["draft", "open", "paid", "overdue", "cancelled"], {
      message: "Selecione um status",
    }),
    currency: z.enum(SUPPORTED_CURRENCIES, { message: "Selecione a moeda" }),
    amount: z
      .string()
      .min(1, "Informe o valor")
      .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), "Valor inválido")
      .refine((v) => Number(v.replace(",", ".")) > 0, "Valor deve ser maior que zero"),
    issue_date: z.string().min(1, "Informe a data de emissão"),
    due_date: z.string().min(1, "Informe o vencimento"),
    external_id: z.string().trim().optional(),
  })
  .refine((data) => data.due_date >= data.issue_date, {
    message: "Vencimento deve ser igual ou posterior à emissão",
    path: ["due_date"],
  })

type InvoiceFormValues = z.infer<typeof invoiceSchema>

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
}

const today = () => new Date().toISOString().slice(0, 10)
const inNDays = (n: number) => {
  const date = new Date()
  date.setDate(date.getDate() + n)
  return date.toISOString().slice(0, 10)
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function inputToCents(input: string): number {
  return Math.round(Number(input.replace(",", ".")) * 100)
}

export function InvoiceFormDialog({ open, onOpenChange, invoice }: InvoiceFormDialogProps) {
  const isEditing = Boolean(invoice)
  const customersQuery = useCustomers()
  const createMutation = useCreateInvoice()
  const updateMutation = useUpdateInvoice()

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: "",
      status: "draft",
      currency: "AUD",
      amount: "",
      issue_date: today(),
      due_date: inNDays(30),
      external_id: "",
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      customer_id: invoice?.customer.id ?? "",
      status: invoice?.status ?? "draft",
      currency: (invoice?.currency as InvoiceFormValues["currency"]) ?? "AUD",
      amount: invoice ? centsToInput(invoice.amount_cents) : "",
      issue_date: invoice?.issue_date ?? today(),
      due_date: invoice?.due_date ?? inNDays(30),
      external_id: invoice?.external_id ?? "",
    })
  }, [open, invoice, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      customer_id: values.customer_id,
      status: values.status,
      currency: values.currency,
      amount_cents: inputToCents(values.amount),
      issue_date: values.issue_date,
      due_date: values.due_date,
      external_id: values.external_id?.length ? values.external_id : null,
    }

    try {
      if (invoice) {
        await updateMutation.mutateAsync({ id: invoice.id, payload })
        toast.success("Fatura atualizada")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Fatura criada")
      }
      onOpenChange(false)
    } catch (err) {
      const apiError = toApiError(err, "Não foi possível salvar a fatura")
      if (apiError.fieldErrors) {
        Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
          // Map server-side `customer` errors to the `customer_id` field.
          const key = (field === "customer" ? "customer_id" : field) as keyof InvoiceFormValues
          form.setError(key, { type: "server", message: messages.join(", ") })
        })
      }
      toast.error(apiError.message)
    }
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const customers = customersQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar fatura" : "Nova fatura"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da fatura."
              : "Preencha os dados para emitir uma nova fatura."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="Cliente"
            required
            error={form.formState.errors.customer_id?.message}
          >
            <Controller
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={customersQuery.isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        customersQuery.isLoading ? "Carregando clientes…" : "Selecione o cliente"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 && !customersQuery.isLoading ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Nenhum cliente cadastrado.
                      </div>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Moeda"
              required
              error={form.formState.errors.currency?.message}
            >
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Valor"
              htmlFor="invoice-amount"
              required
              error={form.formState.errors.amount?.message}
            >
              <Input
                id="invoice-amount"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("amount")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Emissão"
              htmlFor="invoice-issue-date"
              required
              error={form.formState.errors.issue_date?.message}
            >
              <Input
                id="invoice-issue-date"
                type="date"
                {...form.register("issue_date")}
              />
            </FormField>

            <FormField
              label="Vencimento"
              htmlFor="invoice-due-date"
              required
              error={form.formState.errors.due_date?.message}
            >
              <Input
                id="invoice-due-date"
                type="date"
                {...form.register("due_date")}
              />
            </FormField>
          </div>

          <FormField
            label="Status"
            required
            error={form.formState.errors.status?.message}
          >
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="ID externo"
            htmlFor="invoice-external-id"
            error={form.formState.errors.external_id?.message}
          >
            <Input
              id="invoice-external-id"
              autoComplete="off"
              placeholder="INV-1001"
              {...form.register("external_id")}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || customers.length === 0}>
              {isSubmitting ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar fatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
