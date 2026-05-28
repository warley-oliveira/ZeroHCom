import { createFileRoute, Link } from "@tanstack/react-router"
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiArrowRightLine,
  RiMoneyDollarCircleLine,
  RiShoppingBag3Line,
  RiTimeLine,
  RiUser3Line,
} from "@remixicon/react"
import type { ComponentType } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
})

type IconComponent = ComponentType<{ className?: string }>

type Kpi = {
  label: string
  value: string
  delta: number
  icon: IconComponent
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

const KPIS: Kpi[] = [
  {
    label: "Receita do mês",
    value: currency.format(184320),
    delta: 12.4,
    icon: RiMoneyDollarCircleLine,
  },
  {
    label: "Pedidos novos",
    value: "142",
    delta: 8.1,
    icon: RiShoppingBag3Line,
  },
  {
    label: "Clientes ativos",
    value: "1.284",
    delta: 3.2,
    icon: RiUser3Line,
  },
  {
    label: "Tempo médio de resposta",
    value: "1h 42m",
    delta: -6.5,
    icon: RiTimeLine,
  },
]

type Atividade = {
  id: number
  titulo: string
  detalhe: string
  quando: string
  tipo: "pedido" | "cliente" | "pagamento"
}

const ATIVIDADES: Atividade[] = [
  { id: 1, titulo: "Pedido PED-1042 confirmado", detalhe: "Ana Beatriz Costa · R$ 1.289,90", quando: "há 12 min", tipo: "pedido" },
  { id: 2, titulo: "Pagamento aprovado", detalhe: "PED-1040 · R$ 3.120,50", quando: "há 38 min", tipo: "pagamento" },
  { id: 3, titulo: "Novo cliente cadastrado", detalhe: "Carla Mendes · plano Starter", quando: "há 1h", tipo: "cliente" },
  { id: 4, titulo: "Pedido PED-1039 cancelado", detalhe: "Diego Ferreira · estorno R$ 89,90", quando: "há 3h", tipo: "pedido" },
  { id: 5, titulo: "Pagamento aprovado", detalhe: "PED-1038 · R$ 760,00", quando: "ontem", tipo: "pagamento" },
]

const TIPO_DOT: Record<Atividade["tipo"], string> = {
  pedido: "bg-sky-500",
  cliente: "bg-emerald-500",
  pagamento: "bg-amber-500",
}

const SPARK_BARS = [42, 58, 49, 71, 62, 80, 75, 91, 85, 97, 88, 104]
const SPARK_MAX = Math.max(...SPARK_BARS)

function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {firstName ? `Bom te ver de novo, ${firstName}. ` : ""}
          Visão geral da sua operação em tempo real.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon
          const positive = kpi.delta >= 0
          const DeltaIcon = positive ? RiArrowUpLine : RiArrowDownLine
          return (
            <Card key={kpi.label}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{kpi.label}</CardDescription>
                  <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                  {kpi.value}
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    positive ? "text-emerald-500" : "text-destructive",
                  )}
                >
                  <DeltaIcon className="size-3" />
                  {Math.abs(kpi.delta).toFixed(1)}%
                  <span className="text-muted-foreground font-normal">
                    vs. mês passado
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vendas — últimos 12 meses</CardTitle>
                <CardDescription>Receita mensal (mock)</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/relatorios">
                  Ver relatórios
                  <RiArrowRightLine />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end justify-between gap-1.5">
              {SPARK_BARS.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
                  style={{ height: `${(value / SPARK_MAX) * 100}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
            <CardDescription>Últimos eventos no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ATIVIDADES.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    TIPO_DOT[a.tipo],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.titulo}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.detalhe}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.quando}
                </span>
              </div>
            ))}
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="ghost" size="sm">
              Ver tudo
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
