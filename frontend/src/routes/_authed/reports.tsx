import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { RiDownloadLine } from '@remixicon/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/_authed/reports')({
  component: RelatoriosPage,
})

const MOCK_BARS = [38, 52, 41, 64, 58, 72, 80, 69, 91, 76, 88, 95]
const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]
const MAX = Math.max(...MOCK_BARS)

function RelatoriosPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
            {t('reports.title')}
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-xs font-normal text-amber-500"
            >
              {t('reports.mockBadge')}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('reports.subtitle')}
          </p>
        </div>
        <Button variant="outline">
          <RiDownloadLine />
          {t('reports.exportCsv')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.monthlyRevenue.title')}</CardTitle>
          <CardDescription>
            {t('reports.monthlyRevenue.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end justify-between gap-2">
            {MOCK_BARS.map((value, i) => {
              const month = t(`reports.months.${MONTH_KEYS[i]}`)
              return (
                <div
                  key={MONTH_KEYS[i]}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-colors hover:bg-primary"
                    style={{ height: `${(value / MAX) * 100}%` }}
                    title={`${month}: ${value}`}
                  />
                  <div className="text-xs text-muted-foreground">{month}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
