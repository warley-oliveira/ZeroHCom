import { RiFileCopyLine } from "@remixicon/react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface CopyFieldProps {
  label: string
  value: string
}

export function CopyField({ label, value }: CopyFieldProps) {
  const { t } = useTranslation()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t("portal.copyField.copied", { label }))
    } catch {
      toast.error(t("portal.copyField.error"))
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={t("portal.copyField.aria", { label })}
        onClick={copy}
      >
        <RiFileCopyLine />
      </Button>
    </div>
  )
}
