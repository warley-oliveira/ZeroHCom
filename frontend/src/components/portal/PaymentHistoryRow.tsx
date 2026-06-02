import { RiCheckLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { formatDate, formatMoney } from "@/lib/format"
import type { PortalPayment } from "@/types/portal"

const KNOWN_METHODS = ["stripe", "payid", "bank_transfer"]

interface PaymentHistoryRowProps {
  payment: PortalPayment
  onViewReceipt: () => void
}

export function PaymentHistoryRow({ payment, onViewReceipt }: PaymentHistoryRowProps) {
  const { t } = useTranslation()
  const method = KNOWN_METHODS.includes(payment.method)
    ? t(`portal.methods.${payment.method}`)
    : payment.method

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
          <RiCheckLine className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium tabular-nums">
            {formatMoney(payment.amount_cents, payment.currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(payment.payment_date)} · {method}
            {payment.kind === "bond" ? ` · ${t("portal.bond.label")}` : ""}
          </div>
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onViewReceipt}>
        {t("portal.viewReceipt")}
      </Button>
    </div>
  )
}
