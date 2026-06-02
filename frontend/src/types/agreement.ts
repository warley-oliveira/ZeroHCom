import type { Asset } from "./asset"
import type { Customer } from "./customer"

export type AgreementStatus = "active" | "cancelled" | "paused"

// Relationship-aware bond filter for the agreements list.
export type AgreementBondFilter = "required" | "paid" | "pending"

export interface Agreement {
  id: string
  billing_cycle: string | null
  status: AgreementStatus
  start_date: string | null
  end_date: string | null
  currency: string
  amount_cents: number
  amount_formatted: string
  bond_amount_cents: number
  bond_amount_formatted: string
  bond_required: boolean
  bond_paid: boolean
  customer: Pick<Customer, "id" | "name" | "email" | "external_id">
  asset: Pick<Asset, "id" | "name" | "asset_type"> | null
}
