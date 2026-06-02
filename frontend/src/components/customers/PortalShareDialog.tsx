import { useState } from "react"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"
import { RiFileCopyLine, RiRefreshLine } from "@remixicon/react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useRegeneratePortalLink } from "@/hooks/useCustomers"
import { toApiError } from "@/lib/api-errors"
import type { Customer } from "@/types/customer"

interface PortalShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

export function PortalShareDialog({ open, onOpenChange, customer }: PortalShareDialogProps) {
  const { t } = useTranslation()
  const regenerate = useRegeneratePortalLink()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!customer) return null

  const url = `${window.location.origin}/portal/${customer.portal_token}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t("common.copied"))
    } catch {
      toast.error(t("customers.portal.copyError"))
    }
  }

  const doRegenerate = async () => {
    try {
      await regenerate.mutateAsync(customer.id)
      toast.success(t("customers.portal.regenerated"))
      setConfirmOpen(false)
    } catch (err) {
      toast.error(toApiError(err, t("customers.portal.regenerateError")).message)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customers.portal.title", { name: customer.name })}</DialogTitle>
            <DialogDescription>
              {t("customers.portal.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center rounded-lg border bg-white p-4">
            <QRCodeSVG value={url} size={148} />
          </div>

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={url}
              aria-label={t("customers.portal.linkAria")}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button type="button" size="icon" variant="outline" aria-label={t("customers.portal.copyAria")} onClick={copy}>
              <RiFileCopyLine />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setConfirmOpen(true)}
            disabled={regenerate.isPending}
          >
            <RiRefreshLine />
            {t("customers.portal.regenerate")}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customers.portal.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("customers.portal.confirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerate.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                doRegenerate()
              }}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? t("customers.portal.confirm.regenerating") : t("customers.portal.confirm.submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
