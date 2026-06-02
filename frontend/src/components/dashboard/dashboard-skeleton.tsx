import { StatCard } from "@/components/dashboard/stat-card"
import { StatCardGrid } from "@/components/dashboard/stat-card-grid"

// KPI row in its loading shape (same footprint as the real cards → no layout shift).
export function StatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <StatCardGrid>
      {Array.from({ length: count }).map((_, i) => (
        <StatCard key={i} label="" value={0} isLoading />
      ))}
    </StatCardGrid>
  )
}
