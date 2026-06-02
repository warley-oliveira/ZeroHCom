import { useTranslation } from "react-i18next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  agingLabel,
  INVOICE_STATUS_COLORS,
  invoiceStatusLabel,
} from "@/components/dashboard/dashboard-config"
import { formatMoney } from "@/lib/format"
import type { DashboardSummary } from "@/types/dashboard"

export function InvoiceStatusCard({ data }: { data: DashboardSummary }) {
  const { t } = useTranslation()
  const { invoice_status, overdue_aging, currency } = data
  const total = invoice_status.reduce((sum, row) => sum + row.amount_cents, 0)
  const overdueTotal = overdue_aging.reduce((sum, row) => sum + row.amount_cents, 0)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t("dashboard.invoices.title")}</CardTitle>
        <CardDescription>{t("dashboard.invoices.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {total > 0 ? (
          <>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {invoice_status.map((row) => (
                <div
                  key={row.status}
                  style={{
                    width: `${(row.amount_cents / total) * 100}%`,
                    backgroundColor: INVOICE_STATUS_COLORS[row.status],
                  }}
                  title={invoiceStatusLabel(row.status, t)}
                />
              ))}
            </div>
            <ul className="grid gap-1.5 text-sm">
              {invoice_status.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-[3px]"
                      style={{ backgroundColor: INVOICE_STATUS_COLORS[row.status] }}
                    />
                    {invoiceStatusLabel(row.status, t)}
                    <span className="text-xs text-muted-foreground/70">({row.count})</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(row.amount_cents, currency)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("dashboard.invoices.empty")}</p>
        )}

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("dashboard.invoices.agingTitle")}</span>
            <span className="tabular-nums text-destructive">{formatMoney(overdueTotal, currency)}</span>
          </div>
          {overdueTotal > 0 ? (
            overdue_aging.map((row) => (
              <div key={row.bucket} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {agingLabel(row.bucket, t)}
                  <span className="ml-1 text-xs text-muted-foreground/70">({row.count})</span>
                </span>
                <span className="tabular-nums">{formatMoney(row.amount_cents, currency)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.invoices.noOverdue")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
