import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
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
import { useCreateTransaction } from "@/hooks/useTransactions"
import { toApiError } from "@/lib/api-errors"
import type { TransactionDirection } from "@/types/transaction"

type TranslateFn = (key: string) => string

// UI category options carry their own default direction (income vs expense),
// but the operator can still override the type explicitly. Labels come from i18n
// (the canonical `dashboard.categories.*` keys) at render time.
const CATEGORIES: { value: string; direction: TransactionDirection }[] = [
  { value: "fuel", direction: "expense" },
  { value: "tolls", direction: "expense" },
  { value: "maintenance", direction: "expense" },
  { value: "insurance", direction: "expense" },
  { value: "uber_income", direction: "income" },
  { value: "didi_income", direction: "income" },
]

const buildTransactionSchema = (t: TranslateFn) =>
  z.object({
    direction: z.enum(["income", "expense"], { message: t("transactions.form.errors.typeRequired") }),
    category: z.string().min(1, t("transactions.form.errors.categoryRequired")),
    amount: z
      .string()
      .min(1, t("transactions.form.errors.amountRequired"))
      .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), t("transactions.form.errors.amountInvalid"))
      .refine((v) => Number(v.replace(",", ".")) > 0, t("transactions.form.errors.amountPositive")),
    date: z.string().min(1, t("transactions.form.errors.dateRequired")),
    asset_id: z.string().min(1, t("transactions.form.errors.assetRequired")),
  })

type TransactionFormValues = z.infer<ReturnType<typeof buildTransactionSchema>>

const today = () => new Date().toISOString().slice(0, 10)

function inputToCents(input: string): number {
  return Math.round(Number(input.replace(",", ".")) * 100)
}

interface TransactionFormProps {
  /** Called after a successful save (e.g. to close a dialog). */
  onSuccess?: () => void
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { t } = useTranslation()
  const assetsQuery = useAssetOptions()
  const createMutation = useCreateTransaction()
  const assets = assetsQuery.data ?? []

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(buildTransactionSchema(t)),
    defaultValues: {
      direction: "expense",
      category: "fuel",
      amount: "",
      date: today(),
      asset_id: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        direction: values.direction,
        category: values.category,
        amount_cents: inputToCents(values.amount),
        date: values.date,
        currency: "AUD",
        asset_id: values.asset_id,
      })
      toast.success(t("transactions.form.toasts.created"))
      // Keep the type/category/car for fast repeated entry; clear the amount.
      form.reset({ ...values, amount: "" })
      onSuccess?.()
    } catch (err) {
      const apiError = toApiError(err, t("transactions.form.toasts.saveError"))
      toast.error(apiError.message)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("transactions.form.fields.type")} required error={form.formState.errors.direction?.message}>
          <Controller
            control={form.control}
            name="direction"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t("ledger.direction.income")}</SelectItem>
                  <SelectItem value="expense">{t("ledger.direction.expense")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label={t("transactions.form.fields.category")} required error={form.formState.errors.category?.message}>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  // Default the type to match the picked category.
                  const picked = CATEGORIES.find((c) => c.value === value)
                  if (picked) form.setValue("direction", picked.direction)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(`dashboard.categories.${c.value}`)}
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
          label={t("transactions.form.fields.amount")}
          htmlFor="transaction-amount"
          required
          error={form.formState.errors.amount?.message}
        >
          <Input
            id="transaction-amount"
            inputMode="decimal"
            placeholder={t("transactions.form.amountPlaceholder")}
            {...form.register("amount")}
          />
        </FormField>

        <FormField
          label={t("transactions.form.fields.date")}
          htmlFor="transaction-date"
          required
          error={form.formState.errors.date?.message}
        >
          {/* Controlled so the default (today) actually lands in the native
              date input and the value is never `undefined` at validation time. */}
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Input
                id="transaction-date"
                type="date"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label={t("transactions.form.fields.asset")} required error={form.formState.errors.asset_id?.message}>
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
                      ? t("transactions.form.assetLoading")
                      : t("transactions.form.assetPlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assets.length === 0 && !assetsQuery.isLoading ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t("transactions.form.noAssets")}
                  </div>
                ) : (
                  assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={createMutation.isPending || assets.length === 0}>
        {form.watch("direction") === "income" ? <RiArrowUpLine /> : <RiArrowDownLine />}
        {createMutation.isPending ? t("common.saving") : t("transactions.form.submit")}
      </Button>
    </form>
  )
}
