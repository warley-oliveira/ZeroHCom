import { createFileRoute } from "@tanstack/react-router"
import { RiFilter3Line } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/_authed/pedidos")({
  component: PedidosPage,
})

type Pedido = {
  id: string
  cliente: string
  valor: number
  status: "pago" | "aguardando" | "cancelado"
  data: string
}

const MOCK_PEDIDOS: Pedido[] = [
  { id: "PED-1042", cliente: "Ana Beatriz Costa", valor: 1289.9, status: "pago", data: "2026-05-27" },
  { id: "PED-1041", cliente: "Bruno Almeida", valor: 540.0, status: "aguardando", data: "2026-05-27" },
  { id: "PED-1040", cliente: "Eduarda Lima", valor: 3120.5, status: "pago", data: "2026-05-26" },
  { id: "PED-1039", cliente: "Diego Ferreira", valor: 89.9, status: "cancelado", data: "2026-05-25" },
  { id: "PED-1038", cliente: "Ana Beatriz Costa", valor: 760.0, status: "pago", data: "2026-05-25" },
  { id: "PED-1037", cliente: "Carla Mendes", valor: 220.0, status: "aguardando", data: "2026-05-24" },
]

const STATUS_STYLES: Record<Pedido["status"], string> = {
  pago: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
  aguardando: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  cancelado: "bg-destructive/10 text-destructive ring-destructive/20",
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const date = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
})

function PedidosPage() {
  const total = MOCK_PEDIDOS.reduce((acc, p) => acc + p.valor, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            {MOCK_PEDIDOS.length} pedidos · total {currency.format(total)}
          </p>
        </div>
        <Button variant="outline">
          <RiFilter3Line />
          Filtros
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Pedidos recentes</CardTitle>
          <CardDescription>Últimos lançamentos (mock)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {MOCK_PEDIDOS.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[100px_1fr_auto_auto_70px] items-center gap-4 px-4 py-3 text-sm"
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {p.id}
                </div>
                <div className="truncate">{p.cliente}</div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[p.status]}`}
                >
                  {p.status}
                </span>
                <div className="tabular-nums">{currency.format(p.valor)}</div>
                <div className="text-right text-xs text-muted-foreground">
                  {date.format(new Date(p.data))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
