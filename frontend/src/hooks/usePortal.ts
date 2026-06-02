import { useQuery } from "@tanstack/react-query"

import { publicApi } from "@/lib/public-api"
import { toApiError } from "@/lib/api-errors"
import type { PortalData } from "@/types/portal"

export const portalQueryKey = (token: string) => ["portal", token] as const

export function usePortal(token: string) {
  return useQuery({
    queryKey: portalQueryKey(token),
    queryFn: async (): Promise<PortalData> => {
      const { data } = await publicApi.get<PortalData>(`/api/public/portal/${token}`)
      return data
    },
    enabled: Boolean(token),
    // A 404 means an invalid/revoked link — never worth retrying.
    retry: (count, err) => (toApiError(err).status === 404 ? false : count < 1),
  })
}
