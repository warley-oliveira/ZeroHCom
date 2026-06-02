import { RiTimeLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatMoney } from "@/lib/format"
import type { PortalInvoice } from "@/types/portal"

const INVOICE_STATUS_CLASS: Record<string, string> = {
  open: "border-info/20 bg-info/10 text-info",
  overdue: "border-destructive/20 bg-destructive/10 text-destructive",
}

interface OpenInvoiceRowProps {
  invoice: PortalInvoice
  onPay: () => void
}

export function OpenInvoiceRow({ invoice, onPay }: OpenInvoiceRowProps) {
  const { t } = useTranslation()
  const statusClass = INVOICE_STATUS_CLASS[invoice.status] ?? ""
  const statusLabel = INVOICE_STATUS_CLASS[invoice.status]
    ? t(`portal.invoiceStatus.${invoice.status}`)
    : invoice.status

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="space-y-0.5">
        <div className="font-medium tabular-nums">{formatMoney(invoice.amount_cents, invoice.currency)}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("portal.invoice.dueOn", { date: formatDate(invoice.due_date) })}</span>
          <Badge variant="outline" className={statusClass}>
            {statusLabel}
          </Badge>
        </div>
      </div>
      {invoice.pending ? (
        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-500">
          <RiTimeLine />
          {t("portal.status.underReview")}
        </Badge>
      ) : (
        <Button size="sm" className="w-full sm:w-auto" onClick={onPay}>
          {t("portal.invoice.pay")}
        </Button>
      )}
    </div>
  )
}
