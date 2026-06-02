import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Controller, useForm } from "react-hook-form"
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
import { useAssetOptions } from "@/hooks/useAssets"
import { useCustomerOptions } from "@/hooks/useCustomers"
import { useCreateAgreement, useUpdateAgreement } from "@/hooks/useAgreements"
import { toApiError } from "@/lib/api-errors"
import type { Agreement, AgreementStatus } from "@/types/agreement"

const AGREEMENT_STATUSES: AgreementStatus[] = ["active", "cancelled", "paused"]

const BILLING_CYCLES = ["weekly", "monthly"] as const

const SUPPORTED_CURRENCIES = ["AUD", "BRL", "USD", "EUR", "GBP"] as const

// Sentinel value for "no asset" — Radix Select does not allow an empty string item value.
const NO_ASSET = "__none__"

type TFunc = (key: string) => string

const makeAgreementSchema = (t: TFunc) =>
  z.object({
    customer_id: z.string().min(1, t("agreements.validation.customerRequired")),
    asset_id: z.string().optional(),
    billing_cycle: z.enum(["weekly", "monthly"], { message: t("agreements.validation.cycleRequired") }),
    status: z.enum(["active", "cancelled", "paused"], {
      message: t("agreements.validation.statusRequired"),
    }),
    currency: z.enum(SUPPORTED_CURRENCIES, { message: t("agreements.validation.currencyRequired") }),
    amount: z
      .string()
      .min(1, t("agreements.validation.amountRequired"))
      .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), t("agreements.validation.amountInvalid"))
      .refine(
        (v) => Number(v.replace(",", ".")) > 0,
        t("agreements.validation.amountPositive"),
      ),
    // Optional security deposit (caução). Empty = no bond.
    bond_amount: z
      .string()
      .refine(
        (v) => v === "" || /^\d+([.,]\d{1,2})?$/.test(v),
        t("agreements.validation.amountInvalid"),
      ),
    start_date: z.string().min(1, t("agreements.validation.startDateRequired")),
    end_date: z.string().optional(),
  })

type AgreementFormValues = z.infer<ReturnType<typeof makeAgreementSchema>>

interface AgreementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agreement?: Agreement | null
}

const today = () => new Date().toISOString().slice(0, 10)

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function inputToCents(input: string): number {
  return Math.round(Number(input.replace(",", ".")) * 100)
}

export function AgreementFormDialog({ open, onOpenChange, agreement }: AgreementFormDialogProps) {
  const { t } = useTranslation()
  const isEditing = Boolean(agreement)
  const customersQuery = useCustomerOptions()
  const assetsQuery = useAssetOptions()
  const createMutation = useCreateAgreement()
  const updateMutation = useUpdateAgreement()

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(makeAgreementSchema(t)),
    defaultValues: {
      customer_id: "",
      asset_id: NO_ASSET,
      billing_cycle: "monthly",
      status: "active",
      currency: "AUD",
      amount: "",
      bond_amount: "",
      start_date: today(),
      end_date: "",
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      customer_id: agreement?.customer.id ?? "",
      asset_id: agreement?.asset?.id ?? NO_ASSET,
      billing_cycle: (agreement?.billing_cycle as AgreementFormValues["billing_cycle"]) ?? "monthly",
      status: agreement?.status ?? "active",
      currency: (agreement?.currency as AgreementFormValues["currency"]) ?? "AUD",
      amount: agreement ? centsToInput(agreement.amount_cents) : "",
      bond_amount: agreement?.bond_amount_cents ? centsToInput(agreement.bond_amount_cents) : "",
      start_date: agreement?.start_date ?? today(),
      end_date: agreement?.end_date ?? "",
    })
  }, [open, agreement, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      customer_id: values.customer_id,
      asset_id: values.asset_id && values.asset_id !== NO_ASSET ? values.asset_id : null,
      billing_cycle: values.billing_cycle,
      status: values.status,
      currency: values.currency,
      amount_cents: inputToCents(values.amount),
      bond_amount_cents: values.bond_amount.length ? inputToCents(values.bond_amount) : 0,
      start_date: values.start_date,
      end_date: values.end_date?.length ? values.end_date : null,
    }

    try {
      if (agreement) {
        await updateMutation.mutateAsync({ id: agreement.id, payload })
        toast.success(t("agreements.toasts.updated"))
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(t("agreements.toasts.created"))
      }
      onOpenChange(false)
    } catch (err) {
      const apiError = toApiError(err, t("agreements.toasts.saveError"))
      if (apiError.fieldErrors) {
        Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
          const key = (
            field === "customer" ? "customer_id" : field === "asset" ? "asset_id" : field
          ) as keyof AgreementFormValues
          form.setError(key, { type: "server", message: messages.join(", ") })
        })
      }
      toast.error(apiError.message)
    }
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const customers = customersQuery.data ?? []
  const assets = assetsQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("agreements.form.editTitle") : t("agreements.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("agreements.form.editDescription") : t("agreements.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label={t("agreements.form.fields.customer")}
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
                        customersQuery.isLoading
                          ? t("agreements.form.customerLoading")
                          : t("agreements.form.customerPlaceholder")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 && !customersQuery.isLoading ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t("agreements.form.noCustomers")}
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

          <FormField
            label={t("agreements.form.fields.asset")}
            error={form.formState.errors.asset_id?.message}
          >
            <Controller
              control={form.control}
              name="asset_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={assetsQuery.isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        assetsQuery.isLoading
                          ? t("agreements.form.assetLoading")
                          : t("agreements.form.noAsset")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ASSET}>{t("agreements.form.noAsset")}</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("agreements.form.fields.currency")}
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
              label={t("agreements.form.fields.amount")}
              htmlFor="agreement-amount"
              required
              error={form.formState.errors.amount?.message}
            >
              <Input
                id="agreement-amount"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("amount")}
              />
            </FormField>
          </div>

          <FormField
            label={t("agreements.form.fields.bond")}
            htmlFor="agreement-bond"
            error={form.formState.errors.bond_amount?.message}
          >
            <Input
              id="agreement-bond"
              inputMode="decimal"
              placeholder="0,00"
              {...form.register("bond_amount")}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("agreements.form.fields.cycle")}
              required
              error={form.formState.errors.billing_cycle?.message}
            >
              <Controller
                control={form.control}
                name="billing_cycle"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`agreements.cycle.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label={t("agreements.form.fields.status")}
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
                      {AGREEMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`agreements.status.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("agreements.form.fields.startDate")}
              htmlFor="agreement-start-date"
              required
              error={form.formState.errors.start_date?.message}
            >
              <Input id="agreement-start-date" type="date" {...form.register("start_date")} />
            </FormField>

            <FormField
              label={t("agreements.form.fields.endDate")}
              htmlFor="agreement-end-date"
              error={form.formState.errors.end_date?.message}
            >
              <Input id="agreement-end-date" type="date" {...form.register("end_date")} />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || customers.length === 0}>
              {isSubmitting
                ? t("common.saving")
                : isEditing
                  ? t("common.saveChanges")
                  : t("agreements.form.submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
