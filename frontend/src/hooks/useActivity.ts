import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { DashboardActivity } from "@/types/dashboard"

export const activityQueryKey = (limit: number) => ["dashboards", "activity", limit] as const

export function useActivity(limit = 12) {
  return useQuery({
    queryKey: activityQueryKey(limit),
    queryFn: async (): Promise<DashboardActivity> => {
      const { data } = await api.get<DashboardActivity>("/api/v1/dashboards/activity", {
        params: { limit },
      })
      return data
    },
    staleTime: 30_000,
  })
}
