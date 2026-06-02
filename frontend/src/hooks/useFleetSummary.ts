import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { FleetSummaryRow } from "@/types/fleet-summary"

export const fleetSummaryQueryKey = ["dashboards", "fleet_summary"] as const

export function useFleetSummary() {
  return useQuery({
    queryKey: fleetSummaryQueryKey,
    queryFn: async (): Promise<FleetSummaryRow[]> => {
      const { data } = await api.get<FleetSummaryRow[]>("/api/v1/dashboards/fleet_summary")
      return data
    },
  })
}
