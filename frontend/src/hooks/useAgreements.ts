import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { cleanParams } from "@/lib/list-params"
import type { Agreement, AgreementBondFilter, AgreementStatus } from "@/types/agreement"
import type { Paginated } from "@/types/pagination"

export const agreementsQueryKey = ["agreements"] as const

export interface AgreementPayload {
  customer_id: string
  asset_id?: string | null
  billing_cycle?: string | null
  status: AgreementStatus
  currency: string
  amount_cents: number
  bond_amount_cents?: number
  start_date?: string | null
  end_date?: string | null
}

export interface AgreementListParams {
  page?: number
  per_page?: number
  status?: AgreementStatus
  billing_cycle?: string
  customer_id?: string
  asset_id?: string
  bond?: AgreementBondFilter
}

// Paginated list for the agreements table.
export function useAgreements(params: AgreementListParams = {}) {
  return useQuery({
    queryKey: [...agreementsQueryKey, params],
    queryFn: async (): Promise<Paginated<Agreement>> => {
      const { data } = await api.get<Paginated<Agreement>>("/api/v1/agreements", {
        params: cleanParams(params),
      })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

// Full, unpaginated list for the invoices filter's agreement <Select>.
export function useAgreementOptions() {
  return useQuery({
    queryKey: [...agreementsQueryKey, "options"],
    queryFn: async (): Promise<Agreement[]> => {
      const { data } = await api.get<Paginated<Agreement>>("/api/v1/agreements", {
        params: { all: "true" },
      })
      return data.data
    },
  })
}

export function useCreateAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AgreementPayload): Promise<Agreement> => {
      const { data } = await api.post<Agreement>("/api/v1/agreements", { agreement: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

export function useUpdateAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AgreementPayload> }): Promise<Agreement> => {
      const { data } = await api.patch<Agreement>(`/api/v1/agreements/${id}`, { agreement: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

export function useDeleteAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/v1/agreements/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}
