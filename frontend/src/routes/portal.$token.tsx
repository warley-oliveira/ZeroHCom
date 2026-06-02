import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { RiErrorWarningLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PublicLayout } from "@/components/layouts/PublicLayout"
import { PortalSkeleton } from "@/components/portal/PortalSkeleton"
import { PortalHero } from "@/components/portal/PortalHero"
import { ContractCard } from "@/components/portal/ContractCard"
import { OpenInvoiceRow } from "@/components/portal/OpenInvoiceRow"
import { PaymentHistoryRow } from "@/components/portal/PaymentHistoryRow"
import { PaymentDialog } from "@/components/portal/payment/PaymentDialog"
import { ReceiptDialog } from "@/components/portal/payment/ReceiptDialog"
import type { ReceiptView } from "@/components/portal/payment/ReceiptContent"
import { usePortal } from "@/hooks/usePortal"
import { toApiError } from "@/lib/api-errors"
import { formatMoney } from "@/lib/format"
import type { Payable, PortalContract, PortalInvoice, PortalPayment } from "@/types/portal"

export const Route = createFileRoute("/portal/$token")({
  component: PortalPage,
})

function PortalPage() {
  const { t } = useTranslation()
  const { token } = Route.useParams()
  const { data, isLoading, isError, error } = usePortal(token)

  const [payable, setPayable] = useState<Payable | null>(null)
  const [receiptView, setReceiptView] = useState<ReceiptView | null>(null)

  const orgName = data?.organization.name
  const customerName = data?.customer.name ?? ""

  // First settled payment per invoice — lets a paid bond link to its receipt.
  const historyByInvoice = useMemo(() => {
    const map = new Map<string, PortalPayment>()
    data?.history.forEach((p) => {
      if (!map.has(p.invoice_id)) map.set(p.invoice_id, p)
    })
    return map
  }, [data])

  if (isLoading) {
    return (
      <PublicLayout>
        <PortalSkeleton />
      </PublicLayout>
    )
  }

  if (isError || !data) {
    const invalid = toApiError(error).status === 404
    return (
      <PublicLayout>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <RiErrorWarningLine className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                {invalid ? t("portal.error.invalidTitle") : t("portal.error.loadTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {invalid ? t("portal.error.invalidDescription") : t("portal.error.loadDescription")}
              </p>
            </div>
            {!invalid ? (
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t("common.retry")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </PublicLayout>
    )
  }

  const payBond = (contract: PortalContract) => {
    if (!contract.bond?.invoice_id) return
    setPayable({
      invoiceId: contract.bond.invoice_id,
      kind: "bond",
      amountCents: contract.bond.amount_cents,
      currency: contract.currency,
      reference: contract.bond.reference ?? "",
      title: t("portal.payable.bondTitle", {
        asset: contract.asset?.name ?? t("portal.contract.fallbackName"),
      }),
    })
  }

  const payInvoice = (invoice: PortalInvoice) => {
    setPayable({
      invoiceId: invoice.id,
      kind: "invoice",
      amountCents: invoice.amount_cents,
      currency: invoice.currency,
      reference: invoice.reference,
      title: t("portal.payable.invoiceTitle", { reference: invoice.reference }),
    })
  }

  const viewReceipt = (payment: PortalPayment) => {
    setReceiptView({
      title: payment.kind === "bond" ? t("portal.receipt.kindBond") : t("portal.receipt.kindInvoice"),
      reference: null,
      method: payment.method,
      amountFormatted: formatMoney(payment.amount_cents, payment.currency),
      paidAt: payment.payment_date,
      confirmation: payment.external_id ?? payment.id,
      orgName: orgName ?? "",
      customerName,
    })
  }

  const viewBondReceipt = (contract: PortalContract) => {
    const invoiceId = contract.bond?.invoice_id
    const payment = invoiceId ? historyByInvoice.get(invoiceId) : undefined
    if (payment) viewReceipt(payment)
  }

  return (
    <PublicLayout orgName={orgName}>
      <div className="space-y-8">
        <PortalHero customerName={customerName} />

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("portal.sections.contracts")}</h2>
          {data.contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("portal.sections.contractsEmpty")}</p>
          ) : (
            data.contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onPayBond={() => payBond(contract)}
                onViewBondReceipt={() => viewBondReceipt(contract)}
              />
            ))
          )}
        </section>

        {data.open_invoices.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">{t("portal.sections.openInvoices")}</h2>
            <div className="space-y-2">
              {data.open_invoices.map((invoice) => (
                <OpenInvoiceRow key={invoice.id} invoice={invoice} onPay={() => payInvoice(invoice)} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("portal.sections.history")}</h2>
          {data.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("portal.sections.historyEmpty")}</p>
          ) : (
            <Card>
              <CardContent className="divide-y">
                {data.history.map((payment) => (
                  <PaymentHistoryRow
                    key={payment.id}
                    payment={payment}
                    onViewReceipt={() => viewReceipt(payment)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <PaymentDialog
        token={token}
        payable={payable}
        instructions={data.payment_instructions}
        orgName={orgName ?? ""}
        customerName={customerName}
        open={Boolean(payable)}
        onOpenChange={(open) => {
          if (!open) setPayable(null)
        }}
      />

      <ReceiptDialog
        open={Boolean(receiptView)}
        onOpenChange={(open) => {
          if (!open) setReceiptView(null)
        }}
        view={receiptView}
      />
    </PublicLayout>
  )
}
