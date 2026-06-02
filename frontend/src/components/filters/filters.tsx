import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { RiCloseLine, RiSearchLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Reusable filter-bar building blocks shared by every list screen. State lives
// in the URL (TanStack Router search params); these are controlled inputs that
// report changes upward — the route decides how to persist them.

// Radix <Select> forbids an empty-string item value, so the "no filter" option
// uses this sentinel and is mapped back to `undefined` on change.
const ALL_SENTINEL = "__all__"

export interface FilterSelectOption {
  value: string
  label: ReactNode
}

interface FilterBarProps {
  children: ReactNode
  /** Shown only when at least one filter is active. */
  onClear?: () => void
  hasActiveFilters?: boolean
  className?: string
}

export function FilterBar({ children, onClear, hasActiveFilters, className }: FilterBarProps) {
  const { t } = useTranslation()
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {onClear && hasActiveFilters ? (
        <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={onClear}>
          <RiCloseLine />
          {t("common.filters.clear")}
        </Button>
      ) : null}
    </div>
  )
}

interface FilterSelectProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: FilterSelectOption[]
  /** Label for the "all" entry; also the trigger text when nothing is selected. */
  allLabel: string
  ariaLabel: string
  className?: string
}

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
  className,
}: FilterSelectProps) {
  return (
    <Select
      value={value ?? ALL_SENTINEL}
      onValueChange={(next) => onChange(next === ALL_SENTINEL ? undefined : next)}
    >
      <SelectTrigger size="default" className={cn("h-9 w-auto min-w-[9rem]", className)} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SENTINEL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface FilterSearchProps {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder: string
  ariaLabel: string
  className?: string
}

// Debounced text input: types locally, pushes upward (to the URL) after a pause,
// and accepts external resets (e.g. "clear filters") back into the field.
export function FilterSearch({
  value = "",
  onChange,
  placeholder,
  ariaLabel,
  className,
}: FilterSearchProps) {
  const [local, setLocal] = useState(value)
  const debounced = useDebouncedValue(local, 350)
  const lastPushed = useRef(value)

  useEffect(() => {
    if (debounced === lastPushed.current) return
    lastPushed.current = debounced
    onChange(debounced.trim() === "" ? undefined : debounced)
  }, [debounced, onChange])

  useEffect(() => {
    if (value === lastPushed.current) return
    lastPushed.current = value
    setLocal(value)
  }, [value])

  return (
    <div className="relative">
      <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("h-9 w-56 pl-8", className)}
      />
    </div>
  )
}

interface FilterDateProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  ariaLabel: string
  className?: string
}

export function FilterDate({ value, onChange, ariaLabel, className }: FilterDateProps) {
  return (
    <Input
      type="date"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || undefined)}
      aria-label={ariaLabel}
      className={cn("h-9 w-auto", className)}
    />
  )
}
