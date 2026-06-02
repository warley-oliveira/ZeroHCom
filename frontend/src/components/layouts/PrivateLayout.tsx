import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import {
  RiBarChart2Line,
  RiBillLine,
  RiCarLine,
  RiDashboardLine,
  RiFileList3Line,
  RiFileTextLine,
  RiInboxLine,
  RiLogoutBoxLine,
  RiMoneyDollarCircleLine,
  RiSettings3Line,
  RiShoppingBag3Line,
  RiUser3Line,
} from "@remixicon/react"
import { useEffect, useRef, type ComponentType, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { ClearLedgerLogo } from "@/components/ClearLedgerLogo"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { NewTransactionDialog } from "@/components/transactions/NewTransactionDialog"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<{ className?: string }>

type NavItem = {
  to: string
  labelKey: string
  icon: IconComponent
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: RiDashboardLine },
  { to: "/customers", labelKey: "nav.customers", icon: RiUser3Line },
  { to: "/invoices", labelKey: "nav.invoices", icon: RiFileList3Line },
  { to: "/assets", labelKey: "nav.assets", icon: RiCarLine },
  { to: "/agreements", labelKey: "nav.agreements", icon: RiFileTextLine },
  { to: "/ledger", labelKey: "nav.ledger", icon: RiBillLine },
  { to: "/expenses", labelKey: "nav.expenses", icon: RiMoneyDollarCircleLine },
  { to: "/orders", labelKey: "nav.orders", icon: RiShoppingBag3Line },
  { to: "/products", labelKey: "nav.products", icon: RiInboxLine },
  { to: "/reports", labelKey: "nav.reports", icon: RiBarChart2Line },
  { to: "/settings", labelKey: "nav.settings", icon: RiSettings3Line },
]

export function PrivateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Only the outlet scrolls (the shell is pinned to the viewport), so reset it to
  // the top on navigation — otherwise a new page would inherit the old scroll.
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    navigate({ to: "/login" })
  }

  const initials = (user?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link to="/dashboard" aria-label="ClearLedger">
            <ClearLedgerLogo className="max-w-[150px]" />
          </Link>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                }}
              >
                <Icon className="size-4 shrink-0" />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {user?.name ?? "—"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {user?.email ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Frosted-glass header: stays pinned above the outlet while content
            scrolls beneath it, blurring through in both light and dark mode. */}
        <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
          <div className="text-sm text-muted-foreground">
            {user?.name ? t("layout.greeting", { name: user.name.split(" ")[0] }) : "ZeroHCom"}
          </div>
          <div className="flex items-center gap-2">
            <NewTransactionDialog />
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <RiLogoutBoxLine />
              {t("layout.logout")}
            </Button>
          </div>
        </header>

        {/* Only scroll region. pt offsets the absolute header (h-14) while keeping
            the original content gap. */}
        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto px-6 pb-6 pt-20">
          {children}
        </main>
      </div>
    </div>
  )
}
