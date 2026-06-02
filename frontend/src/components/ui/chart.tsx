import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Shadcn chart wrapper, written with forwardRef for React 18 (the v4 generator
// targets React 19 ref-as-prop). Colors are wired through CSS vars so they
// follow the theme tokens defined in index.css.

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    color?: string
  }
>

interface ChartContextProps {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart(): ChartContextProps {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color)
  if (colorConfig.length === 0) return null

  const css = `[data-chart=${id}] {\n${colorConfig
    .map(([key, item]) => `  --color-${key}: ${item.color};`)
    .join("\n")}\n}`

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}

const ChartTooltip = RechartsPrimitive.Tooltip

interface TooltipItem {
  name?: string
  dataKey?: string | number
  value?: number | string
  color?: string
}

interface ChartTooltipContentProps {
  active?: boolean
  label?: string | number
  payload?: TooltipItem[]
  hideLabel?: boolean
  labelFormatter?: (label: string | number) => React.ReactNode
  valueFormatter?: (value: number, name: string) => React.ReactNode
  className?: string
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ active, label, payload, hideLabel = false, labelFormatter, valueFormatter, className }, ref) => {
    const { config } = useChart()

    if (!active || !payload || payload.length === 0) return null

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] gap-1.5 rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!hideLabel && label !== undefined ? (
          <div className="font-medium text-foreground">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        ) : null}
        <div className="grid gap-1">
          {payload.map((item, index) => {
            const key = String(item.name ?? item.dataKey ?? index)
            const itemConfig = config[key]
            const numeric = typeof item.value === "number" ? item.value : Number(item.value ?? 0)
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
                  />
                  {itemConfig?.label ?? key}
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {valueFormatter ? valueFormatter(numeric, key) : numeric.toLocaleString("pt-BR")}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsPrimitive.Legend

interface LegendItem {
  value?: string
  color?: string
  dataKey?: string | number
}

interface ChartLegendContentProps {
  payload?: LegendItem[]
  className?: string
}

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  ({ payload, className }, ref) => {
    const { config } = useChart()
    if (!payload || payload.length === 0) return null

    return (
      <div ref={ref} className={cn("flex flex-wrap items-center justify-center gap-3 pt-3", className)}>
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.value ?? index)
          const itemConfig = config[key]
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
              />
              {itemConfig?.label ?? item.value}
            </div>
          )
        })}
      </div>
    )
  },
)
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
}
