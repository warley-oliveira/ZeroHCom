import { createFileRoute } from "@tanstack/react-router"
import { RiAddLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/_authed/produtos")({
  component: ProdutosPage,
})

type Produto = {
  sku: string
  nome: string
  preco: number
  estoque: number
}

const MOCK_PRODUTOS: Produto[] = [
  { sku: "ZHC-001", nome: "Plano Starter — anual", preco: 1188.0, estoque: 9999 },
  { sku: "ZHC-002", nome: "Plano Pro — anual", preco: 3588.0, estoque: 9999 },
  { sku: "ZHC-003", nome: "Add-on: Integração API", preco: 240.0, estoque: 150 },
  { sku: "ZHC-004", nome: "Add-on: Onboarding assistido", preco: 980.0, estoque: 25 },
  { sku: "ZHC-005", nome: "Add-on: SLA premium", preco: 540.0, estoque: 60 },
]

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function ProdutosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Produtos
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de planos e add-ons.
          </p>
        </div>
        <Button>
          <RiAddLine />
          Novo produto
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_PRODUTOS.map((p) => (
          <Card key={p.sku}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="leading-snug">{p.nome}</CardTitle>
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {p.sku}
                </span>
              </div>
              <CardDescription>
                Estoque: {p.estoque.toLocaleString("pt-BR")} unid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums">
                {currency.format(p.preco)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
