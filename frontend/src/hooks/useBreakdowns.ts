import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { DashboardBreakdowns, DateRange } from "@/types/dashboard"

export const breakdownsQueryKey = (range: DateRange) =>
  ["dashboards", "breakdowns", range.from, range.to] as const

export function useBreakdowns(range: DateRange) {
  return useQuery({
    queryKey: breakdownsQueryKey(range),
    queryFn: async (): Promise<DashboardBreakdowns> => {
      const { data } = await api.get<DashboardBreakdowns>("/api/v1/dashboards/breakdowns", {
        params: { from: range.from, to: range.to },
      })
      return data
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
