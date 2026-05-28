import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Invoice, InvoiceStatus } from "@/types/invoice"

export const invoicesQueryKey = ["invoices"] as const

export interface InvoicePayload {
  customer_id: string
  external_id?: string | null
  status: InvoiceStatus
  currency: string
  amount_cents: number
  issue_date: string
  due_date: string
}

export function useInvoices() {
  return useQuery({
    queryKey: invoicesQueryKey,
    queryFn: async (): Promise<Invoice[]> => {
      const { data } = await api.get<Invoice[]>("/api/v1/invoices")
      return data
    },
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: InvoicePayload): Promise<Invoice> => {
      const { data } = await api.post<Invoice>("/api/v1/invoices", { invoice: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicesQueryKey })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<InvoicePayload> }): Promise<Invoice> => {
      const { data } = await api.patch<Invoice>(`/api/v1/invoices/${id}`, { invoice: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicesQueryKey })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/v1/invoices/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicesQueryKey })
    },
  })
}
