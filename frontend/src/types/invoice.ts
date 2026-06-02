import type { Customer } from "./customer"

export type InvoiceStatus = "draft" | "open" | "paid" | "overdue" | "cancelled"

// Used by the invoices list filter; not serialized into the row itself.
export type InvoiceKind = "rent" | "bond"

export type PaymentStatus = "pending" | "confirmed" | "rejected"

// A customer-initiated payment claim (PayID/bank) awaiting org review.
export interface PendingPayment {
  id: string
  invoice_id: string
  external_id: string | null
  method: string
  status: PaymentStatus
  payment_date: string
  currency: string
  amount_cents: number
  amount_formatted: string
}

export interface Invoice {
  id: string
  external_id: string | null
  status: InvoiceStatus
  issue_date: string
  due_date: string
  currency: string
  amount_cents: number
  amount_formatted: string
  customer: Pick<Customer, "id" | "name" | "email" | "external_id">
  pending_payments: PendingPayment[]
}
