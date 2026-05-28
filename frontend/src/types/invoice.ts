import type { Customer } from "./customer"

export type InvoiceStatus = "draft" | "open" | "paid" | "overdue" | "cancelled"

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
}
