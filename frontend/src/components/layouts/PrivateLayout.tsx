import { Link, useNavigate } from "@tanstack/react-router"
import {
  RiBarChart2Line,
  RiDashboardLine,
  RiFileList3Line,
  RiInboxLine,
  RiLogoutBoxLine,
  RiSettings3Line,
  RiShoppingBag3Line,
  RiUser3Line,
} from "@remixicon/react"
import type { ComponentType, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<{ className?: string }>

type NavItem = {
  to: string
  label: string
  icon: IconComponent
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: RiDashboardLine },
  { to: "/clientes", label: "Clientes", icon: RiUser3Line },
  { to: "/invoices", label: "Faturas", icon: RiFileList3Line },
  { to: "/pedidos", label: "Pedidos", icon: RiShoppingBag3Line },
  { to: "/produtos", label: "Produtos", icon: RiInboxLine },
  { to: "/relatorios", label: "Relatórios", icon: RiBarChart2Line },
  { to: "/configuracoes", label: "Configurações", icon: RiSettings3Line },
]

export function PrivateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="font-heading text-base font-semibold tracking-tight">
            ZeroHCom
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
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
                {item.label}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="text-sm text-muted-foreground">
            {user?.name ? `Olá, ${user.name.split(" ")[0]}` : "ZeroHCom"}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <RiLogoutBoxLine />
            Sair
          </Button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
