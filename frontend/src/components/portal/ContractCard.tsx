import { useTranslation } from "react-i18next"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { agreementStatusClass } from "@/lib/agreement-display"
import { formatDate, formatMoney } from "@/lib/format"
import { BondRow } from "./BondRow"
import type { PortalContract } from "@/types/portal"

interface ContractCardProps {
  contract: PortalContract
  onPayBond: () => void
  onViewBondReceipt: () => void
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function ContractCard({ contract, onPayBond, onViewBondReceipt }: ContractCardProps) {
  const { t } = useTranslation()

  const periodLabel = (): string => {
    if (!contract.start_date) return t("common.dash")
    const start = formatDate(contract.start_date)
    return contract.end_date ? `${start} — ${formatDate(contract.end_date)}` : start
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contract.asset?.name ?? t("portal.contract.fallbackName")}</CardTitle>
        <CardDescription>
          {contract.billing_cycle ? t(`portal.cycle.${contract.billing_cycle}`) : t("common.dash")}
        </CardDescription>
        <CardAction>
          <Badge variant="outline" className={agreementStatusClass(contract.status)}>
            {t(`portal.contractStatus.${contract.status}`)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetaRow
          label={t("portal.contract.recurringAmount")}
          value={formatMoney(contract.amount_cents, contract.currency)}
        />
        <MetaRow label={t("portal.contract.period")} value={periodLabel()} />

        {contract.bond ? (
          <>
            <Separator className="my-1" />
            <BondRow
              bond={contract.bond}
              currency={contract.currency}
              onPay={onPayBond}
              onViewReceipt={onViewBondReceipt}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
