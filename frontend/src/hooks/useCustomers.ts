import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { cleanParams } from "@/lib/list-params"
import { invoicesQueryKey } from "@/hooks/useInvoices"
import type { Customer } from "@/types/customer"
import type { Paginated } from "@/types/pagination"

export const customersQueryKey = ["customers"] as const

export interface CustomerPayload {
  name: string
  email?: string | null
  external_id?: string | null
}

export interface CustomerListParams {
  page?: number
  per_page?: number
  q?: string
}

// Paginated list for the customers table.
export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: [...customersQueryKey, params],
    queryFn: async (): Promise<Paginated<Customer>> => {
      const { data } = await api.get<Paginated<Customer>>("/api/v1/customers", {
        params: cleanParams(params),
      })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

// Full, unpaginated list for <Select> dropdowns (invoice/agreement forms).
export function useCustomerOptions() {
  return useQuery({
    queryKey: [...customersQueryKey, "options"],
    queryFn: async (): Promise<Customer[]> => {
      const { data } = await api.get<Paginated<Customer>>("/api/v1/customers", {
        params: { all: "true" },
      })
      return data.data
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

// Rotates the customer's portal token, revoking any previously shared link.
export function useRegeneratePortalLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<Customer> => {
      const { data } = await api.post<Customer>(`/api/v1/customers/${id}/regenerate_portal_token`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryKey })
    },
  })
}
