import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/forms/FormField"
import { useCreateAsset, useUpdateAsset } from "@/hooks/useAssets"
import { toApiError } from "@/lib/api-errors"
import type { Asset, AssetStatus } from "@/types/asset"

const ASSET_STATUSES: { value: AssetStatus; labelKey: string }[] = [
  { value: "available", labelKey: "assets.statuses.available" },
  { value: "rented", labelKey: "assets.statuses.rented" },
  { value: "maintenance", labelKey: "assets.statuses.maintenance" },
]

type TFunction = (key: string) => string

function buildAssetSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(1, t("assets.form.errors.nameRequired")),
    asset_type: z.string().trim().optional(),
    status: z.enum(["available", "rented", "maintenance"], {
      message: t("assets.form.errors.statusRequired"),
    }),
    metadata: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => {
          if (!value) return true
          try {
            const parsed = JSON.parse(value)
            return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
          } catch {
            return false
          }
        },
        { message: t("assets.form.errors.metadataInvalid") },
      ),
  })
}

type AssetFormValues = z.infer<ReturnType<typeof buildAssetSchema>>

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset?: Asset | null
}

function metadataToInput(metadata: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) return ""
  return JSON.stringify(metadata, null, 2)
}

export function AssetFormDialog({ open, onOpenChange, asset }: AssetFormDialogProps) {
  const { t } = useTranslation()
  const isEditing = Boolean(asset)
  const createMutation = useCreateAsset()
  const updateMutation = useUpdateAsset()

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(buildAssetSchema(t)),
    defaultValues: {
      name: "",
      asset_type: "",
      status: "available",
      metadata: "",
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      name: asset?.name ?? "",
      asset_type: asset?.asset_type ?? "",
      status: asset?.status ?? "available",
      metadata: asset ? metadataToInput(asset.metadata) : "",
    })
  }, [open, asset, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      asset_type: values.asset_type?.length ? values.asset_type : null,
      status: values.status,
      metadata: values.metadata?.length
        ? (JSON.parse(values.metadata) as Record<string, unknown>)
        : {},
    }

    try {
      if (asset) {
        await updateMutation.mutateAsync({ id: asset.id, payload })
        toast.success(t("assets.toasts.updated"))
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(t("assets.toasts.created"))
      }
      onOpenChange(false)
    } catch (err) {
      const apiError = toApiError(err, t("assets.toasts.saveError"))
      if (apiError.fieldErrors) {
        Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
          form.setError(field as keyof AssetFormValues, {
            type: "server",
            message: messages.join(", "),
          })
        })
      }
      toast.error(apiError.message)
    }
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("assets.form.editTitle") : t("assets.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("assets.form.editDescription")
              : t("assets.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label={t("assets.form.fields.name")}
            htmlFor="asset-name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="asset-name"
              placeholder={t("assets.form.placeholders.name")}
              {...form.register("name")}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("assets.form.fields.type")}
              htmlFor="asset-type"
              error={form.formState.errors.asset_type?.message}
            >
              <Input
                id="asset-type"
                placeholder={t("assets.form.placeholders.type")}
                {...form.register("asset_type")}
              />
            </FormField>

            <FormField
              label={t("assets.form.fields.status")}
              required
              error={form.formState.errors.status?.message}
            >
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {t(s.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <FormField
            label={t("assets.form.fields.metadata")}
            htmlFor="asset-metadata"
            error={form.formState.errors.metadata?.message}
          >
            <Textarea
              id="asset-metadata"
              rows={6}
              spellCheck={false}
              className="font-mono text-xs"
              placeholder={'{\n  "plate": "ABC-123",\n  "year": 2022\n}'}
              {...form.register("metadata")}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common.saving")
                : isEditing
                  ? t("common.saveChanges")
                  : t("assets.form.submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
