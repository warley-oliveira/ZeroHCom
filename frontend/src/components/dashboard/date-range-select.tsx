import { useTranslation } from "react-i18next"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PRESET_ORDER } from "@/lib/dateRanges"
import type { DateRangePreset } from "@/types/dashboard"

interface DateRangeSelectProps {
  value: DateRangePreset
  onChange: (preset: DateRangePreset) => void
  disabled?: boolean
}

export function DateRangeSelect({ value, onChange, disabled }: DateRangeSelectProps) {
  const { t } = useTranslation()
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRangePreset)} disabled={disabled}>
      <SelectTrigger className="w-[170px]" aria-label={t("dashboard.header.period")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRESET_ORDER.map((preset) => (
          <SelectItem key={preset} value={preset}>
            {t(`dashboard.presets.${preset}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
