import { useTranslation } from "react-i18next"
import { createFileRoute } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TransactionForm } from "@/components/transactions/TransactionForm"

export const Route = createFileRoute("/_authed/expenses")({
  component: ExpensesPage,
})

function ExpensesPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("expenses.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("expenses.subtitle")}
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="border-b">
          <CardTitle>{t("expenses.card.title")}</CardTitle>
          <CardDescription>
            {t("expenses.card.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <TransactionForm />
        </CardContent>
      </Card>
    </div>
  )
}
