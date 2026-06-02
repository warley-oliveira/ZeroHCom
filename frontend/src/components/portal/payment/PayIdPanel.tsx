import { QRCodeSVG } from "qrcode.react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/format"
import { CopyField } from "./CopyField"
import type { PaymentPanelProps } from "./types"

export function PayIdPanel({ amountCents, currency, reference, instructions, isSubmitting, onConfirm }: PaymentPanelProps) {
  const { t } = useTranslation()
  const payid = instructions.payid.identifier
  const qrValue = `payid://${payid}?amount=${(amountCents / 100).toFixed(2)}&reference=${reference}`

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("portal.payid.instructions")}</p>

      <div className="flex justify-center rounded-lg border bg-white p-4">
        <QRCodeSVG value={qrValue} size={148} />
      </div>

      <CopyField label={t("portal.payid.fieldLabel")} value={payid} />
      <CopyField label={t("portal.fields.reference")} value={reference} />

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">{t("portal.fields.amount")}</span>
        <span className="font-medium tabular-nums">{formatMoney(amountCents, currency)}</span>
      </div>

      <Button type="button" className="w-full" disabled={isSubmitting} onClick={onConfirm}>
        {isSubmitting ? t("portal.confirming") : t("portal.alreadyPaid")}
      </Button>
    </div>
  )
}
