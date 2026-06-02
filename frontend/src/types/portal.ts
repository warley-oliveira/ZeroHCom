export type InvoiceKind = "rent" | "bond"

export interface PortalOrganization {
  id: string
  name: string
  slug: string
}

export interface PortalPaymentInstructions {
  payid: { identifier: string }
  bank: { account_name: string; bsb: string; account_number: string }
}

export interface PortalBond {
  required: boolean
  paid: boolean
  // A claim was submitted (PayID/bank) and is awaiting organization confirmation.
  pending: boolean
  amount_cents: number
  amount_formatted: string
  invoice_id: string | null
  status: string | null
  reference: string | null
}

export interface PortalContractAsset {
  id: string
  name: string
  asset_type: string | null
}

export interface PortalContract {
  id: string
  status: string
  billing_cycle: string | null
  start_date: string | null
  end_date: string | null
  currency: string
  amount_cents: number
  amount_formatted: string
  asset: PortalContractAsset | null
  bond: PortalBond | null
}

export interface PortalInvoice {
  id: string
  agreement_id: string | null
  kind: InvoiceKind
  status: string
  issue_date: string
  due_date: string
  currency: string
  amount_cents: number
  amount_formatted: string
  reference: string
  // True when the customer already submitted a claim awaiting org review.
  pending: boolean
}

export interface PortalPayment {
  id: string
  invoice_id: string
  kind: InvoiceKind
  method: string
  external_id: string | null
  payment_date: string
  currency: string
  amount_cents: number
  amount_formatted: string
}

export interface PortalData {
  organization: PortalOrganization
  customer: { id: string; name: string; email: string | null }
  payment_instructions: PortalPaymentInstructions
  contracts: PortalContract[]
  open_invoices: PortalInvoice[]
  history: PortalPayment[]
}

// A unit that can be paid from the portal (a contract's bond or a rent invoice).
export interface Payable {
  invoiceId: string
  kind: "bond" | "invoice"
  amountCents: number
  currency: string
  reference: string
  title: string
}
