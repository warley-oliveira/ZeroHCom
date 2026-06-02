import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Bucket, DashboardCashflow, DateRange } from "@/types/dashboard"

export const cashflowQueryKey = (range: DateRange, bucket: Bucket) =>
  ["dashboards", "cashflow", range.from, range.to, bucket] as const

export function useCashflow(range: DateRange, bucket: Bucket) {
  return useQuery({
    queryKey: cashflowQueryKey(range, bucket),
    queryFn: async (): Promise<DashboardCashflow> => {
      const { data } = await api.get<DashboardCashflow>("/api/v1/dashboards/cashflow", {
        params: { from: range.from, to: range.to, bucket },
      })
      return data
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
