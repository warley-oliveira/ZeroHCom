import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { DashboardPendingConfirmations } from "@/types/dashboard"

// Lives under the ["dashboards", ...] key so the confirm/reject mutations
// (which invalidate ["dashboards"]) refetch the queue automatically.
export const pendingConfirmationsQueryKey = ["dashboards", "pending_confirmations"] as const

export function usePendingConfirmations() {
  return useQuery({
    queryKey: pendingConfirmationsQueryKey,
    queryFn: async (): Promise<DashboardPendingConfirmations> => {
      const { data } = await api.get<DashboardPendingConfirmations>(
        "/api/v1/dashboards/pending_confirmations",
      )
      return data
    },
    staleTime: 30_000,
  })
}
