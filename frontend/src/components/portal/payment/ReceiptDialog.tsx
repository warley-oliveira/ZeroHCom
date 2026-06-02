import { RiPrinterLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ReceiptContent, type ReceiptView } from "./ReceiptContent"

interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ReceiptView | null
}

export function ReceiptDialog({ open, onOpenChange, view }: ReceiptDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("portal.receipt.title")}</DialogTitle>
        </DialogHeader>
        {view ? <ReceiptContent view={view} /> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button onClick={() => window.print()}>
            <RiPrinterLine />
            {t("common.print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
