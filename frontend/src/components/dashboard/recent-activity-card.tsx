import { useState, type ComponentType } from "react"
import {
  RiArrowDownLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiFileList3Line,
  RiHandCoinLine,
} from "@remixicon/react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PaymentReviewDialog } from "@/components/dashboard/payment-review-dialog"
import { categoryLabel, invoiceStatusLabel } from "@/components/dashboard/dashboard-config"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActivityEvent, PendingConfirmation } from "@/types/dashboard"

interface RowView {
  icon: ComponentType<{ className?: string }>
  iconClass: string
  title: string
  subtitle: string
  amountClass: string
}

function describe(event: ActivityEvent, t: TFunction): RowView {
  switch (event.type) {
    case "transaction": {
      const income = event.direction === "income"
      return {
        icon: income ? RiArrowUpLine : RiArrowDownLine,
        iconClass: income ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
        title: categoryLabel(event.category, t),
        subtitle:
          event.asset?.name ??
          (income ? t("dashboard.activity.income") : t("dashboard.activity.expense")),
        amountClass: income ? "text-success" : "text-destructive",
      }
    }
    case "payment":
      return {
        icon: RiHandCoinLine,
        iconClass: "bg-success/10 text-success",
        title: t("dashboard.activity.payment", { method: event.method }),
        subtitle: event.customer_name ?? t("common.dash"),
        amountClass: "text-success",
      }
    case "invoice":
      return {
        icon: RiFileList3Line,
        iconClass: "bg-info/10 text-info",
        title: t("dashboard.activity.invoice", { status: invoiceStatusLabel(event.status, t) }),
        subtitle: event.customer_name ?? t("common.dash"),
        amountClass: "text-foreground",
      }
  }
}

// A clickable pending claim that opens the review modal. Styled amber to read as
// "needs your attention", distinct from the neutral history rows below.
function PendingRow({
  payment,
  onReview,
}: {
  payment: PendingConfirmation
  onReview: (payment: PendingConfirmation) => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onReview(payment)}
      aria-label={t("dashboard.pendingConfirmations.reviewAria", {
        name: payment.customer?.name ?? payment.invoice_reference,
      })}
      className="group flex w-full items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-left transition-colors hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
        <RiHandCoinLine className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {payment.customer?.name ?? payment.invoice_reference}
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {payment.invoice_reference}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium tabular-nums text-amber-600 dark:text-amber-500">
          {formatMoney(payment.amount_cents, payment.currency)}
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</div>
      </div>
      <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

export function RecentActivityCard({
  events,
  pendingPayments = [],
}: {
  events: ActivityEvent[]
  pendingPayments?: PendingConfirmation[]
}) {
  const { t } = useTranslation()
  const [reviewing, setReviewing] = useState<PendingConfirmation | null>(null)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t("dashboard.activity.title")}</CardTitle>
        <CardDescription>{t("dashboard.activity.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {pendingPayments.length > 0 ? (
          <div className="mb-4 duration-300 animate-in fade-in slide-in-from-top-2">
            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
              </span>
              <h3 className="text-sm font-medium">{t("dashboard.pendingConfirmations.title")}</h3>
              <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-500 tabular-nums">
                {pendingPayments.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {pendingPayments.map((payment) => (
                <PendingRow key={payment.id} payment={payment} onReview={setReviewing} />
              ))}
            </div>
            <Separator className="mt-4" />
          </div>
        ) : null}

        {events.length > 0 ? (
          <ul className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {events.map((event) => {
              const view = describe(event, t)
              const Icon = view.icon
              return (
                <li key={`${event.type}-${event.id}`} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      view.iconClass,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{view.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{view.subtitle}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-sm font-medium tabular-nums", view.amountClass)}>
                      {formatMoney(event.amount_cents, event.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(event.at)}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("dashboard.activity.empty")}</p>
        )}
      </CardContent>

      <PaymentReviewDialog
        payment={reviewing}
        open={reviewing !== null}
        onOpenChange={(open) => !open && setReviewing(null)}
      />
    </Card>
  )
}
