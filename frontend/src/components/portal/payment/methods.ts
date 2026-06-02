import { RiBankCardLine, RiBankLine, RiQrCodeLine } from "@remixicon/react"

import { BankTransferPanel } from "./BankTransferPanel"
import { PayIdPanel } from "./PayIdPanel"
import { StripeMockForm } from "./StripeMockForm"
import type { PaymentMethodDef } from "./types"

// The single source of truth for which payment methods the portal offers.
// Order here is the tab order. Adding a real/extra method later is one entry.
// Tab labels are rendered via i18n at the usage site, keyed by `id`.
export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: "stripe", icon: RiBankCardLine, Panel: StripeMockForm },
  { id: "payid", icon: RiQrCodeLine, Panel: PayIdPanel },
  { id: "bank_transfer", icon: RiBankLine, Panel: BankTransferPanel },
]
