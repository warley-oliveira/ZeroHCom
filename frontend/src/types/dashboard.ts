import type { InvoiceStatus } from "./invoice"

// --- Date range / period ------------------------------------------------------

export type DateRangePreset =
  | "ultimos_7_dias"
  | "ultimos_30_dias"
  | "ultimos_90_dias"
  | "este_mes"
  | "mes_passado"
  | "este_ano"

/** ISO date strings (yyyy-mm-dd), inclusive. */
export interface DateRange {
  from: string
  to: string
}

export type Bucket = "day" | "week" | "month"

// --- Summary endpoint ---------------------------------------------------------

export interface KpiDelta {
  current_cents: number
  previous_cents: number
  delta_cents: number
  /** null when the previous window was zero (no meaningful percentage). */
  delta_pct: number | null
}

export interface FleetOccupancy {
  rented: number
  total: number
  rate: number // 0..1
}

export interface InvoiceStatusBucket {
  status: InvoiceStatus
  count: number
  amount_cents: number
}

export type AgingBucket = "0_30" | "31_60" | "60_plus"

export interface OverdueAgingBucket {
  bucket: AgingBucket
  count: number
  amount_cents: number
}

export interface DashboardSummary {
  currency: string
  period: DateRange
  kpis: {
    revenue_cents: number
    expense_cents: number
    net_profit_cents: number
    mrr_cents: number
    active_contracts_count: number
    fleet_occupancy: FleetOccupancy
    overdue_cents: number
    overdue_count: number
    cash_collected_cents: number
  }
  deltas: {
    revenue_cents: KpiDelta
    expense_cents: KpiDelta
    net_profit_cents: KpiDelta
  }
  invoice_status: InvoiceStatusBucket[]
  overdue_aging: OverdueAgingBucket[]
}

// --- Breakdowns endpoint ------------------------------------------------------

export interface CategorySlice {
  category: string
  amount_cents: number
}

export interface SourceSlice {
  source_type: string | null
  amount_cents: number
}

export interface PaymentMethodSlice {
  method: string
  count: number
  amount_cents: number
}

export interface DashboardBreakdowns {
  currency: string
  period: DateRange
  expense_by_category: CategorySlice[]
  income_by_category: CategorySlice[]
  income_by_source: SourceSlice[]
  payment_methods: PaymentMethodSlice[]
}

// --- Cashflow endpoint --------------------------------------------------------

export interface IncomeExpensePoint {
  bucket: string // sortable label from API (ISO date or "yyyy-mm")
  income_cents: number
  expense_cents: number
  net_cents: number
}

export interface BilledCollectedPoint {
  bucket: string
  billed_cents: number
  collected_cents: number
}

export interface DashboardCashflow {
  currency: string
  bucket: Bucket
  period: DateRange
  income_expense: IncomeExpensePoint[]
  billed_collected: BilledCollectedPoint[]
}

// --- Activity feed endpoint ---------------------------------------------------

export interface TransactionActivity {
  type: "transaction"
  id: string
  at: string
  direction: "income" | "expense"
  category: string
  amount_cents: number
  currency: string
  asset: { id: string; name: string } | null
}

export interface PaymentActivity {
  type: "payment"
  id: string
  at: string
  method: string
  amount_cents: number
  currency: string
  customer_name: string | null
}

export interface InvoiceActivity {
  type: "invoice"
  id: string
  at: string
  status: InvoiceStatus
  amount_cents: number
  currency: string
  customer_name: string | null
}

export type ActivityEvent = TransactionActivity | PaymentActivity | InvoiceActivity

export interface DashboardActivity {
  events: ActivityEvent[]
}

// --- Pending payment confirmations (action queue) -----------------------------

// A customer-claimed payment (PayID/bank "I've paid") awaiting org review,
// surfaced at the top of the activity panel with approve/reject actions.
export interface PendingConfirmation {
  id: string
  invoice_id: string
  method: string
  external_id: string | null
  payment_date: string
  currency: string
  amount_cents: number
  amount_formatted: string
  kind: string
  invoice_reference: string
  invoice_status: InvoiceStatus
  customer: { id: string; name: string | null; email: string | null } | null
}

export interface DashboardPendingConfirmations {
  payments: PendingConfirmation[]
}
