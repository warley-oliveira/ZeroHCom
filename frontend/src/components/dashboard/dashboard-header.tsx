import { RiRefreshLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { DateRangeSelect } from "@/components/dashboard/date-range-select"
import { cn } from "@/lib/utils"
import type { DateRangePreset } from "@/types/dashboard"

interface DashboardHeaderProps {
  userName?: string
  preset: DateRangePreset
  onPresetChange: (preset: DateRangePreset) => void
  onRefresh: () => void
  isFetching?: boolean
}

export function DashboardHeader({
  userName,
  preset,
  onPresetChange,
  onRefresh,
  isFetching = false,
}: DashboardHeaderProps) {
  const { t } = useTranslation()
  const firstName = userName?.split(" ")[0]

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("dashboard.header.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {firstName ? `${t("dashboard.header.greeting", { name: firstName })} ` : ""}
          {t("dashboard.header.subtitle")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangeSelect value={preset} onChange={onPresetChange} disabled={isFetching} />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label={t("common.reload")}
        >
          <RiRefreshLine className={cn(isFetching && "animate-spin")} />
        </Button>
      </div>
    </div>
  )
}
