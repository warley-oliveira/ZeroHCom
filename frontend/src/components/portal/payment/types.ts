import type { ComponentType } from "react"

import type { PaymentMethodId } from "@/types/payment"
import type { PortalPaymentInstructions } from "@/types/portal"

// Props every payment-method panel receives. A panel renders its own confirm
// button and calls onConfirm — the dialog owns the mutation + status machine.
export interface PaymentPanelProps {
  amountCents: number
  currency: string
  reference: string
  instructions: PortalPaymentInstructions
  isSubmitting: boolean
  onConfirm: () => void
}

// One entry per payment method. Adding a method = one entry + one Panel,
// with zero changes to PaymentDialog. The tab label is rendered via i18n,
// keyed by `id`, at the usage site.
export interface PaymentMethodDef {
  id: PaymentMethodId
  icon: ComponentType<{ className?: string }>
  Panel: ComponentType<PaymentPanelProps>
}
