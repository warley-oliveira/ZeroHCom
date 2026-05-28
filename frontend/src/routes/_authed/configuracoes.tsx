import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"

export const Route = createFileRoute("/_authed/configuracoes")({
  component: ConfiguracoesPage,
})

function ConfiguracoesPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Preferências da sua conta e da organização.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Dados pessoais (mock).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" defaultValue={user?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" defaultValue={user?.email ?? ""} />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button>Salvar</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organização</CardTitle>
            <CardDescription>Identificação multi-tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="org">ID da organização</Label>
              <Input
                id="org"
                readOnly
                value={user?.organization_id ?? ""}
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O ID é definido no provisionamento e não pode ser alterado pela UI.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
