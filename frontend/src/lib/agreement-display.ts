import type { Agreement, AgreementStatus } from "@/types/agreement"

// Status badge colors, shared by the agreements table and the public portal.
// Human-readable labels are translated at each call site via i18n
// (`t("agreements.status.<status>")` / `t("agreements.cycle.<cycle>")`).
export const AGREEMENT_STATUS_CLASSES: Record<AgreementStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
}

export function agreementStatusClass(status: string): string {
  return AGREEMENT_STATUS_CLASSES[status as AgreementStatus] ?? ""
}

// Compact label for an agreement inside a <Select> (e.g. the invoices filter):
// "Customer · Asset", or just the customer when there's no asset.
export function agreementOptionLabel(agreement: Agreement): string {
  return agreement.asset
    ? `${agreement.customer.name} · ${agreement.asset.name}`
    : agreement.customer.name
}
