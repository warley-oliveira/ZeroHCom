import { RiCheckLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/format"

export interface ReceiptView {
  title: string
  reference?: string | null
  method: string
  amountFormatted: string
  paidAt: string
  confirmation: string
  orgName: string
  customerName: string
}

const KNOWN_METHODS = ["stripe", "payid", "bank_transfer"]

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

// Shared receipt visual, reused by the payment success state and the history
// "Ver recibo" dialog. The data-receipt attr is the print target (see index.css).
export function ReceiptContent({ view }: { view: ReceiptView }) {
  const { t } = useTranslation()
  const methodLabel = KNOWN_METHODS.includes(view.method)
    ? t(`portal.methods.${view.method}`)
    : view.method

  return (
    <div data-receipt className="space-y-4 rounded-xl border bg-card p-4 print:border-0">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
          <RiCheckLine className="size-5" />
        </span>
        <div>
          <div className="font-heading text-base font-semibold">{view.orgName}</div>
          <div className="text-xs text-muted-foreground">{t("portal.receipt.subtitle")}</div>
        </div>
      </div>

      <div className="text-center">
        <div className="text-xs text-muted-foreground">{view.title}</div>
        <div className="font-heading text-2xl font-semibold tabular-nums">{view.amountFormatted}</div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Row label={t("portal.receipt.customer")} value={view.customerName} />
        <Row label={t("portal.receipt.method")} value={methodLabel} />
        {view.reference ? <Row label={t("portal.fields.reference")} value={view.reference} /> : null}
        <Row label={t("portal.receipt.date")} value={formatDate(view.paidAt)} />
        <Row label={t("portal.receipt.confirmation")} value={view.confirmation} />
      </div>
    </div>
  )
}
