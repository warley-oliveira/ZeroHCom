import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { RiBankCardLine, RiCheckLine, RiCloseLine } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useConfirmPayment, useRejectPayment } from "@/hooks/useInvoices"
import { formatDate, formatMoney } from "@/lib/format"
import { toApiError } from "@/lib/api-errors"
import { cn } from "@/lib/utils"
import type { PendingConfirmation } from "@/types/dashboard"

// Known payment methods carry an i18n label; anything else (pix, credit_card…)
// falls back to the raw token — mirrors the invoices screen.
const METHOD_KEYS: Record<string, string> = {
  stripe: "invoices.methods.stripe",
  payid: "invoices.methods.payid",
  bank_transfer: "invoices.methods.bank_transfer",
}

interface PaymentReviewDialogProps {
  payment: PendingConfirmation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

export function PaymentReviewDialog({ payment, open, onOpenChange }: PaymentReviewDialogProps) {
  const { t } = useTranslation()
  const confirmPayment = useConfirmPayment()
  const rejectPayment = useRejectPayment()
  const busy = confirmPayment.isPending || rejectPayment.isPending

  const methodLabel = payment
    ? METHOD_KEYS[payment.method]
      ? t(METHOD_KEYS[payment.method])
      : payment.method
    : ""

  const handleApprove = async () => {
    if (!payment) return
    try {
      await confirmPayment.mutateAsync({ invoiceId: payment.invoice_id, paymentId: payment.id })
      toast.success(t("invoices.toasts.paymentConfirmed"))
      onOpenChange(false)
    } catch (err) {
      toast.error(toApiError(err, t("invoices.toasts.paymentConfirmError")).message)
    }
  }

  const handleReject = async () => {
    if (!payment) return
    try {
      await rejectPayment.mutateAsync({ invoiceId: payment.invoice_id, paymentId: payment.id })
      toast.success(t("invoices.toasts.paymentRejected"))
      onOpenChange(false)
    } catch (err) {
      toast.error(toApiError(err, t("invoices.toasts.paymentRejectError")).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.pendingConfirmations.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.pendingConfirmations.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {payment ? (
          <div>
            {/* Hero amount — the number the operator is being asked to approve. */}
            <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 py-5 duration-300 animate-in fade-in zoom-in-95">
              <span className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <RiBankCardLine className="size-5" />
              </span>
              <span className="mt-1 text-2xl font-semibold tabular-nums">
                {formatMoney(payment.amount_cents, payment.currency)}
              </span>
              {payment.kind === "bond" ? (
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-500">
                  {t("invoices.filters.kinds.bond")}
                </Badge>
              ) : null}
            </div>

            <Separator className="my-1" />

            <DetailRow label={t("dashboard.pendingConfirmations.fields.customer")}>
              {payment.customer?.name ?? t("common.dash")}
            </DetailRow>
            <DetailRow label={t("dashboard.pendingConfirmations.fields.reference")}>
              <span className="font-mono text-xs">{payment.invoice_reference}</span>
            </DetailRow>
            <DetailRow label={t("dashboard.pendingConfirmations.fields.method")}>{methodLabel}</DetailRow>
            <DetailRow label={t("dashboard.pendingConfirmations.fields.date")}>
              {formatDate(payment.payment_date)}
            </DetailRow>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className={cn("border-destructive/30 text-destructive hover:bg-destructive/10")}
            disabled={busy}
            onClick={handleReject}
          >
            <RiCloseLine />
            {rejectPayment.isPending
              ? t("dashboard.pendingConfirmations.rejecting")
              : t("invoices.pendingPayment.reject")}
          </Button>
          <Button disabled={busy} onClick={handleApprove}>
            <RiCheckLine />
            {confirmPayment.isPending
              ? t("dashboard.pendingConfirmations.approving")
              : t("invoices.pendingPayment.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
