import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { cleanParams } from "@/lib/list-params"
import type { Asset, AssetStatus } from "@/types/asset"
import type { Paginated } from "@/types/pagination"

export const assetsQueryKey = ["assets"] as const

export interface AssetPayload {
  name: string
  asset_type?: string | null
  status: AssetStatus
  metadata: Record<string, unknown>
}

export interface AssetListParams {
  page?: number
  per_page?: number
  q?: string
  status?: AssetStatus
  asset_type?: string
}

// Paginated list for the assets table.
export function useAssets(params: AssetListParams = {}) {
  return useQuery({
    queryKey: [...assetsQueryKey, params],
    queryFn: async (): Promise<Paginated<Asset>> => {
      const { data } = await api.get<Paginated<Asset>>("/api/v1/assets", {
        params: cleanParams(params),
      })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

// Full, unpaginated list for <Select> dropdowns (agreement/transaction forms).
export function useAssetOptions() {
  return useQuery({
    queryKey: [...assetsQueryKey, "options"],
    queryFn: async (): Promise<Asset[]> => {
      const { data } = await api.get<Paginated<Asset>>("/api/v1/assets", {
        params: { all: "true" },
      })
      return data.data
    },
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AssetPayload): Promise<Asset> => {
      const { data } = await api.post<Asset>("/api/v1/assets", { asset: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AssetPayload> }): Promise<Asset> => {
      const { data } = await api.patch<Asset>(`/api/v1/assets/${id}`, { asset: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/v1/assets/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}
