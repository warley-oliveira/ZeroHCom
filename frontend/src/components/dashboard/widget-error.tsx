import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface WidgetErrorProps {
  message: string
  detail?: string
  onRetry: () => void
}

// Shared error state, matching the existing "Tentar novamente" pattern.
export function WidgetError({ message, detail, onRetry }: WidgetErrorProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2 py-8 text-center text-sm">
      <p className="text-destructive">{message}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      <Button size="sm" variant="outline" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  )
}
