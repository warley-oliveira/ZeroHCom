import { useState } from "react"
import { RiLock2Line } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/forms/FormField"
import { formatMoney } from "@/lib/format"
import type { PaymentPanelProps } from "./types"

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function StripeMockForm({ amountCents, currency, isSubmitting, onConfirm }: PaymentPanelProps) {
  const { t } = useTranslation()
  const [number, setNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")

  const complete = number.replace(/\s/g, "").length >= 12 && expiry.length === 5 && cvc.length >= 3

  return (
    <div className="space-y-4">
      <FormField label={t("portal.card.number")} htmlFor="card-number">
        <Input
          id="card-number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("portal.card.expiry")} htmlFor="card-expiry">
          <Input
            id="card-expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder={t("portal.card.expiryPlaceholder")}
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
          />
        </FormField>
        <FormField label={t("portal.card.cvc")} htmlFor="card-cvc">
          <Input
            id="card-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </FormField>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RiLock2Line className="size-3.5" />
        {t("portal.card.mockHint")}
      </p>

      <Button type="button" className="w-full" disabled={!complete || isSubmitting} onClick={onConfirm}>
        {isSubmitting
          ? t("portal.card.processing")
          : t("portal.card.pay", { amount: formatMoney(amountCents, currency) })}
      </Button>
    </div>
  )
}
