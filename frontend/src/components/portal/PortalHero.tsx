import { useTranslation } from "react-i18next"

interface PortalHeroProps {
  customerName: string
}

export function PortalHero({ customerName }: PortalHeroProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {t("portal.hero.greeting", { name: customerName })}
      </h1>
      <p className="text-sm text-muted-foreground">{t("portal.hero.subtitle")}</p>
    </div>
  )
}
