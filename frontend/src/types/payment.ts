import type { InvoiceKind } from "./portal"

// Canonical payment-method ids — mirror PaymentGateways::REGISTRY on the backend.
export type PaymentMethodId = "stripe" | "payid" | "bank_transfer"

// Returned by POST /api/public/portal/:token/invoices/:id/payments (ReceiptSerializer).
// "succeeded" = settled now (card). "pending" = claim awaiting org confirmation (PayID/bank).
export interface PaymentReceipt {
  receipt_id: string
  external_id: string | null
  method: string
  status: "succeeded" | "pending"
  paid_at: string
  reference: string
  invoice: { id: string; kind: InvoiceKind; status: string }
  currency: string
  amount_cents: number
  amount_formatted: string
}
