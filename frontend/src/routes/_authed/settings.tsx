import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/_authed/settings')({
  component: ConfiguracoesPage,
})

function ConfiguracoesPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
          {t('settings.title')}
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-xs font-normal text-amber-500"
          >
            {t('settings.mockBadge')}
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profile.title')}</CardTitle>
            <CardDescription>
              {t('settings.profile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('settings.profile.fields.name')}</Label>
              <Input id="name" defaultValue={user?.name ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                {t('settings.profile.fields.email')}
              </Label>
              <Input id="email" type="email" defaultValue={user?.email ?? ''} />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button>{t('common.save')}</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.organization.title')}</CardTitle>
            <CardDescription>
              {t('settings.organization.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="org">
                {t('settings.organization.fields.id')}
              </Label>
              <Input
                id="org"
                readOnly
                value={user?.organization_id ?? ''}
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.organization.idHint')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
