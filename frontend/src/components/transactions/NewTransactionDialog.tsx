import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TransactionForm } from "@/components/transactions/TransactionForm"

// Header entry point: a compact "Novo lançamento" button that opens the
// transaction form in a modal. Few fields, so a dialog fits better than a page.
export function NewTransactionDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <RiAddLine />
          {t("transactions.newButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("transactions.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("transactions.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
