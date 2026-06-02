import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Loading placeholder matching a chart card's footprint (no layout shift).
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent className="pt-6">
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  )
}
