import { useMutation, useQueryClient } from "@tanstack/react-query"

import { publicApi } from "@/lib/public-api"
import { portalQueryKey } from "@/hooks/usePortal"
import type { PaymentMethodId, PaymentReceipt } from "@/types/payment"

export interface PayInvoiceInput {
  invoiceId: string
  method: PaymentMethodId
}

export function usePayInvoice(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, method }: PayInvoiceInput): Promise<PaymentReceipt> => {
      // Only `method` is sent — amount/currency are derived server-side from the
      // invoice (anti-tampering), so the client can't under/over-pay.
      const { data } = await publicApi.post<PaymentReceipt>(
        `/api/public/portal/${token}/invoices/${invoiceId}/payments`,
        { payment: { method } },
      )
      return data
    },
    // Refetch the portal so the bond flips to "paga" and the settled invoice
    // moves into the history section.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalQueryKey(token) })
    },
  })
}
