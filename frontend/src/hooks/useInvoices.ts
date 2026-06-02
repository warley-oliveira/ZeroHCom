import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { cleanParams } from "@/lib/list-params"
import type { Invoice, InvoiceKind, InvoiceStatus } from "@/types/invoice"
import type { Paginated } from "@/types/pagination"

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

export interface InvoiceListParams {
  page?: number
  per_page?: number
  q?: string
  status?: InvoiceStatus
  kind?: InvoiceKind
  customer_id?: string
  agreement_id?: string
  due_from?: string
  due_to?: string
}

// Paginated list for the invoices table.
export function useInvoices(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: [...invoicesQueryKey, params],
    queryFn: async (): Promise<Paginated<Invoice>> => {
      const { data } = await api.get<Paginated<Invoice>>("/api/v1/invoices", {
        params: cleanParams(params),
      })
      return data
    },
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
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
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
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
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

interface PaymentReviewInput {
  invoiceId: string
  paymentId: string
}

// Approve a pending customer claim — settles the invoice + posts to the ledger.
export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, paymentId }: PaymentReviewInput): Promise<void> => {
      await api.post(`/api/v1/invoices/${invoiceId}/payments/${paymentId}/confirm`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicesQueryKey })
      queryClient.invalidateQueries({ queryKey: ["dashboards"] })
    },
  })
}

// Dismiss a pending claim — the invoice stays payable.
export function useRejectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, paymentId }: PaymentReviewInput): Promise<void> => {
      await api.post(`/api/v1/invoices/${invoiceId}/payments/${paymentId}/reject`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicesQueryKey })
    },
  })
}
