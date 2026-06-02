import type { ComponentType, ReactNode } from "react"
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/hooks/use-count-up"

export type StatAccent = "default" | "success" | "warning" | "destructive" | "info"

const ACCENT_CHIP: Record<StatAccent, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
}

export interface StatDelta {
  /** Signed percentage vs. the previous period; null hides the chip. */
  pct: number | null
  /** Which direction is "good" — expenses are good when they go down. */
  goodWhen?: "up" | "down"
  label?: string
}

interface StatCardProps {
  label: string
  value: number
  format?: (value: number) => string
  delta?: StatDelta
  icon?: ComponentType<{ className?: string }>
  accent?: StatAccent
  isLoading?: boolean
  countUp?: boolean
  /** Small line below the value (e.g. "2 de 4 alugados"); also hosts a sparkline. */
  footer?: ReactNode
  /** Position in the grid — drives the entrance stagger. */
  index?: number
}

export function StatCard({
  label,
  value,
  format = String,
  delta,
  icon: Icon,
  accent = "default",
  isLoading = false,
  countUp = true,
  footer,
  index = 0,
}: StatCardProps) {
  const { t } = useTranslation()
  // Hooks must run unconditionally; ignore the animated value when countUp is off.
  const animated = useCountUp(value)
  const display = countUp ? animated : value

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-2.5 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  const up = (delta?.pct ?? 0) >= 0
  const goodWhen = delta?.goodWhen ?? "up"
  const isGood = up ? goodWhen === "up" : goodWhen === "down"

  return (
    <Card
      className="transition-transform duration-500 animate-in fade-in slide-in-from-bottom-2 fill-mode-both hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{label}</span>
          {Icon ? (
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", ACCENT_CHIP[accent])}>
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>

        <div className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
          {format(display)}
        </div>

        {delta && delta.pct !== null ? (
          <div className="flex items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                isGood ? "text-success" : "text-destructive",
              )}
            >
              {up ? <RiArrowUpLine className="size-3" /> : <RiArrowDownLine className="size-3" />}
              {Math.abs(delta.pct).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>
            <span className="text-muted-foreground">{delta.label ?? t("dashboard.kpis.vsPrevious")}</span>
          </div>
        ) : footer ? (
          <div className="text-xs text-muted-foreground">{footer}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
