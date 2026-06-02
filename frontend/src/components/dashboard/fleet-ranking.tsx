import { useTranslation } from "react-i18next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FleetSummaryRow } from "@/types/fleet-summary"

const MAX_ROWS = 8

export function FleetRanking({ rows }: { rows: FleetSummaryRow[] }) {
  const { t } = useTranslation()
  const ranked = [...rows]
    .sort((a, b) => b.net_profit_cents - a.net_profit_cents)
    .slice(0, MAX_ROWS)
  const maxAbs = Math.max(1, ...ranked.map((r) => Math.abs(r.net_profit_cents)))

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t("dashboard.ranking.title")}</CardTitle>
        <CardDescription>{t("dashboard.ranking.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {ranked.length > 0 ? (
          <ul className="space-y-3">
            {ranked.map((row) => {
              const name =
                (typeof row.asset.metadata.model === "string" && row.asset.metadata.model) ||
                row.asset.name
              const positive = row.net_profit_cents >= 0
              const width = (Math.abs(row.net_profit_cents) / maxAbs) * 100
              return (
                <li key={row.asset.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{name}</span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        positive ? "text-success" : "text-destructive",
                      )}
                    >
                      {formatMoney(row.net_profit_cents, row.currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", positive ? "bg-success" : "bg-destructive")}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("dashboard.ranking.empty")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
