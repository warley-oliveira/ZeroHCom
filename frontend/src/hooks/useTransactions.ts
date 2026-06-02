import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { cleanParams } from "@/lib/list-params"
import type { Transaction, TransactionDirection } from "@/types/transaction"
import type { Paginated } from "@/types/pagination"

export const transactionsQueryKey = ["transactions"] as const

export interface TransactionPayload {
  direction: TransactionDirection
  category: string
  date: string
  currency: string
  amount_cents: number
  asset_id?: string | null
  source_type?: string | null
  source_id?: string | null
}

export interface TransactionListParams {
  page?: number
  per_page?: number
  direction?: TransactionDirection
  category?: string
  asset_id?: string
  source_type?: string
  date_from?: string
  date_to?: string
}

// Paginated list for the ledger table.
export function useTransactions(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: [...transactionsQueryKey, params],
    queryFn: async (): Promise<Paginated<Transaction>> => {
      const { data } = await api.get<Paginated<Transaction>>("/api/v1/transactions", {
        params: cleanParams(params),
      })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TransactionPayload): Promise<Transaction> => {
      const { data } = await api.post<Transaction>("/api/v1/transactions", { transaction: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey })
      // Ledger entries shift every dashboard aggregate (KPIs, charts, per-car net).
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<TransactionPayload> }): Promise<Transaction> => {
      const { data } = await api.patch<Transaction>(`/api/v1/transactions/${id}`, { transaction: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/v1/transactions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}
