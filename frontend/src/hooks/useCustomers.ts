import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { invoicesQueryKey } from "@/hooks/useInvoices"
import type { Customer } from "@/types/customer"

export const customersQueryKey = ["customers"] as const

export interface CustomerPayload {
  name: string
  email?: string | null
  external_id?: string | null
}

export function useCustomers() {
  return useQuery({
    queryKey: customersQueryKey,
    queryFn: async (): Promise<Customer[]> => {
      const { data } = await api.get<Customer[]>("/api/v1/customers")
      return data
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CustomerPayload): Promise<Customer> => {
      const { data } = await api.post<Customer>("/api/v1/customers", { customer: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryKey })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CustomerPayload> }): Promise<Customer> => {
      const { data } = await api.patch<Customer>(`/api/v1/customers/${id}`, { customer: payload })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryKey })
      // The customer name shows up embedded in invoice payloads, so refresh those too.
      queryClient.invalidateQueries({ queryKey: invoicesQueryKey })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/v1/customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryKey })
    },
  })
}
