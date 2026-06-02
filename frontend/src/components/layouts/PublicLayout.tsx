import type { ReactNode } from "react"
import { RiShieldCheckLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"

interface PublicLayoutProps {
  orgName?: string
  children: ReactNode
}

// Minimal, branded, centered layout for the logged-out customer portal.
// No sidebar (contrast with PrivateLayout); mobile-first; theme tokens only.
export function PublicLayout({ orgName, children }: PublicLayoutProps) {
  const { t } = useTranslation()
  const brand = orgName ?? "ZeroHCom"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 supports-backdrop-filter:backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <span className="font-heading text-base font-semibold tracking-tight">{brand}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RiShieldCheckLine className="size-4 text-success" />
              {t("portal.layout.secureEnvironment")}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">{children}</main>

      <footer className="mx-auto w-full max-w-2xl px-4 pt-4 pb-10 text-center text-xs text-muted-foreground">
        {t("portal.layout.footer", { brand })}
      </footer>
    </div>
  )
}
