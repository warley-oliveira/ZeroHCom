export interface FleetSummaryRow {
  asset: {
    id: string
    name: string
    asset_type: string | null
    metadata: Record<string, unknown>
  }
  currency: string
  income_cents: number
  expense_cents: number
  net_profit_cents: number
}
