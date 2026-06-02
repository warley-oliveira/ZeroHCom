import { RiShieldCheckLine, RiTimeLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/format"
import type { PortalBond } from "@/types/portal"

interface BondRowProps {
  bond: PortalBond
  currency: string
  onPay: () => void
  onViewReceipt: () => void
}

export function BondRow({ bond, currency, onPay, onViewReceipt }: BondRowProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="text-sm font-medium">{t("portal.bond.label")}</div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatMoney(bond.amount_cents, currency)}
        </div>
      </div>

      {bond.paid ? (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
            <RiShieldCheckLine />
            {t("portal.bond.paid")}
          </Badge>
          <Button size="sm" variant="ghost" onClick={onViewReceipt}>
            {t("portal.viewReceipt")}
          </Button>
        </div>
      ) : bond.pending ? (
        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-500">
          <RiTimeLine />
          {t("portal.status.underReview")}
        </Badge>
      ) : (
        <Button size="sm" className="w-full sm:w-auto" onClick={onPay}>
          {t("portal.bond.pay")}
        </Button>
      )}
    </div>
  )
}
