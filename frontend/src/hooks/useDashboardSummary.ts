import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { DashboardSummary, DateRange } from "@/types/dashboard"

export const dashboardSummaryQueryKey = (range: DateRange) =>
  ["dashboards", "summary", range.from, range.to] as const

export function useDashboardSummary(range: DateRange) {
  return useQuery({
    queryKey: dashboardSummaryQueryKey(range),
    queryFn: async (): Promise<DashboardSummary> => {
      const { data } = await api.get<DashboardSummary>("/api/v1/dashboards/summary", {
        params: { from: range.from, to: range.to },
      })
      return data
    },
    // Keep the previous range's data on screen while the new range loads (no flash).
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
