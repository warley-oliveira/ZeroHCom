export type TransactionDirection = "income" | "expense"

export interface Transaction {
  id: string
  direction: TransactionDirection
  category: string
  date: string
  currency: string
  amount_cents: number
  amount_formatted: string
  asset_id: string | null
  source: { type: string; id: string } | null
}
