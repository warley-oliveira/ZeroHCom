import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { FormField } from "@/components/forms/FormField"
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers"
import { toApiError } from "@/lib/api-errors"
import type { Customer } from "@/types/customer"

const customerSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .or(z.literal(""))
    .optional(),
  external_id: z.string().trim().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const isEditing = Boolean(customer)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      external_id: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: customer?.name ?? "",
        email: customer?.email ?? "",
        external_id: customer?.external_id ?? "",
      })
    }
  }, [open, customer, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      email: values.email?.length ? values.email : null,
      external_id: values.external_id?.length ? values.external_id : null,
    }

    try {
      if (customer) {
        await updateMutation.mutateAsync({ id: customer.id, payload })
        toast.success("Cliente atualizado")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Cliente criado")
      }
      onOpenChange(false)
    } catch (err) {
      const apiError = toApiError(err, "Não foi possível salvar o cliente")
      if (apiError.fieldErrors) {
        Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
          form.setError(field as keyof CustomerFormValues, {
            type: "server",
            message: messages.join(", "),
          })
        })
      }
      toast.error(apiError.message)
    }
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do cliente."
              : "Cadastre um novo cliente para faturar."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="Nome"
            htmlFor="customer-name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="customer-name"
              autoComplete="off"
              placeholder="Acme Holdings Pty Ltd"
              {...form.register("name")}
            />
          </FormField>

          <FormField
            label="E-mail"
            htmlFor="customer-email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="customer-email"
              type="email"
              autoComplete="off"
              placeholder="finance@acme.example"
              {...form.register("email")}
            />
          </FormField>

          <FormField
            label="ID externo"
            htmlFor="customer-external-id"
            error={form.formState.errors.external_id?.message}
          >
            <Input
              id="customer-external-id"
              autoComplete="off"
              placeholder="xero-acme"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
