import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/format"
import { CopyField } from "./CopyField"
import type { PaymentPanelProps } from "./types"

export function BankTransferPanel({ amountCents, currency, reference, instructions, isSubmitting, onConfirm }: PaymentPanelProps) {
  const { t } = useTranslation()
  const { account_name, bsb, account_number } = instructions.bank

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("portal.bank.instructions")}</p>

      <CopyField label={t("portal.bank.accountName")} value={account_name} />
      <div className="grid grid-cols-2 gap-3">
        <CopyField label={t("portal.bank.bsb")} value={bsb} />
        <CopyField label={t("portal.bank.accountNumber")} value={account_number} />
      </div>
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
