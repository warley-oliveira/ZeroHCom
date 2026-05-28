import { createFileRoute } from "@tanstack/react-router"
import { RiDownloadLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/_authed/relatorios")({
  component: RelatoriosPage,
})

const MOCK_BARS = [38, 52, 41, 64, 58, 72, 80, 69, 91, 76, 88, 95]
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MAX = Math.max(...MOCK_BARS)

function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada dos últimos 12 meses.
          </p>
        </div>
        <Button variant="outline">
          <RiDownloadLine />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receita mensal</CardTitle>
          <CardDescription>Últimos 12 meses (mock)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end justify-between gap-2">
            {MOCK_BARS.map((value, i) => (
              <div key={MESES[i]} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary/80 transition-colors hover:bg-primary"
                  style={{ height: `${(value / MAX) * 100}%` }}
                  title={`${MESES[i]}: ${value}`}
                />
                <div className="text-xs text-muted-foreground">{MESES[i]}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
