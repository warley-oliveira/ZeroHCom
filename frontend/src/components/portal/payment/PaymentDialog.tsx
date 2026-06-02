import { useEffect, useState } from "react"
import { RiPrinterLine, RiTimeLine } from "@remixicon/react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePayInvoice } from "@/hooks/usePayInvoice"
import { toApiError } from "@/lib/api-errors"
import { formatMoney } from "@/lib/format"
import { PAYMENT_METHODS } from "./methods"
import { ReceiptContent, type ReceiptView } from "./ReceiptContent"
import type { PaymentMethodId, PaymentReceipt } from "@/types/payment"
import type { Payable, PortalPaymentInstructions } from "@/types/portal"

interface PaymentDialogProps {
  token: string
  payable: Payable | null
  instructions: PortalPaymentInstructions
  orgName: string
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDialog({
  token,
  payable,
  instructions,
  orgName,
  customerName,
  open,
  onOpenChange,
}: PaymentDialogProps) {
  const { t } = useTranslation()
  const payMutation = usePayInvoice(token)
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)

  // Reset the success state whenever the dialog reopens for a new payable.
  useEffect(() => {
    if (open) setReceipt(null)
  }, [open, payable?.invoiceId])

  const handlePay = (method: PaymentMethodId) => {
    if (!payable) return
    payMutation.mutate(
      { invoiceId: payable.invoiceId, method },
      {
        onSuccess: (data) => {
          setReceipt(data)
          toast.success(t("portal.payment.toasts.confirmed"))
        },
        onError: (err) => {
          toast.error(toApiError(err, t("portal.payment.toasts.error")).message)
        },
      },
    )
  }

  const receiptView: ReceiptView | null =
    receipt && payable
      ? {
          title: payable.title,
          reference: receipt.reference,
          method: receipt.method,
          amountFormatted: formatMoney(receipt.amount_cents, receipt.currency),
          paidAt: receipt.paid_at,
          confirmation: receipt.external_id ?? receipt.receipt_id,
          orgName,
          customerName,
        }
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {receipt && receiptView && receipt.status === "succeeded" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("portal.payment.success.title")}</DialogTitle>
              <DialogDescription>{t("portal.payment.success.description")}</DialogDescription>
            </DialogHeader>
            <ReceiptContent view={receiptView} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => window.print()}>
                <RiPrinterLine />
                {t("common.print")}
              </Button>
              <Button onClick={() => onOpenChange(false)}>{t("portal.payment.done")}</Button>
            </DialogFooter>
          </>
        ) : receipt ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("portal.payment.informed.title")}</DialogTitle>
              <DialogDescription>{t("portal.payment.informed.description")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                <RiTimeLine className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">{t("portal.status.awaitingConfirmation")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("portal.payment.informed.hint")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("portal.payment.done")}</Button>
            </DialogFooter>
          </>
        ) : payable ? (
          <>
            <DialogHeader>
              <DialogTitle>{payable.title}</DialogTitle>
              <DialogDescription>
                {t("portal.payment.chooseMethod", {
                  amount: formatMoney(payable.amountCents, payable.currency),
                })}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue={PAYMENT_METHODS[0]?.id}>
              <TabsList>
                {PAYMENT_METHODS.map((method) => (
                  <TabsTrigger key={method.id} value={method.id}>
                    <method.icon className="size-4" />
                    {t(`portal.methods.${method.id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PAYMENT_METHODS.map((method) => (
                <TabsContent key={method.id} value={method.id} className="pt-2">
                  <method.Panel
                    amountCents={payable.amountCents}
                    currency={payable.currency}
                    reference={payable.reference}
                    instructions={instructions}
                    isSubmitting={payMutation.isPending}
                    onConfirm={() => handlePay(method.id)}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
