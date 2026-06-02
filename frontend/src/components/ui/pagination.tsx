import { useTranslation } from "react-i18next"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PER_PAGE_OPTIONS, type PaginationMeta } from "@/types/pagination"

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  className?: string
}

// Numbered page list with first/last anchored and a ±1 window around the
// current page, collapsing the gaps to ellipses. Small totals show every page.
function pageSeries(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: Array<number | "ellipsis"> = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)

  if (left > 2) pages.push("ellipsis")
  for (let p = left; p <= right; p++) pages.push(p)
  if (right < total - 1) pages.push("ellipsis")
  pages.push(total)

  return pages
}

// Footer pagination control consumed by every list screen. Numbered pages
// (decision: numbered, not prev/next-only) plus a page-size selector.
export function Pagination({ meta, onPageChange, onPerPageChange, className }: PaginationProps) {
  const { t } = useTranslation()

  // Nothing to paginate and only the default page size — keep the chrome quiet.
  if (meta.count === 0) return null

  const series = pageSeries(meta.page, meta.pages)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("common.pagination.showing", { count: meta.count })}</span>
        <Select value={String(meta.per_page)} onValueChange={(value) => onPerPageChange(Number(value))}>
          <SelectTrigger size="sm" className="h-8" aria-label={t("common.pagination.perPage")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {t("common.pagination.perPageOption", { count: option })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex items-center gap-1" aria-label={t("common.pagination.navLabel")}>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={meta.prev_page === null}
          aria-label={t("common.pagination.previous")}
          onClick={() => meta.prev_page !== null && onPageChange(meta.prev_page)}
        >
          <RiArrowLeftSLine />
        </Button>

        {series.map((entry, index) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === meta.page ? "default" : "outline"}
              size="icon"
              className="size-8 text-sm tabular-nums"
              aria-current={entry === meta.page ? "page" : undefined}
              aria-label={t("common.pagination.goToPage", { page: entry })}
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={meta.next_page === null}
          aria-label={t("common.pagination.next")}
          onClick={() => meta.next_page !== null && onPageChange(meta.next_page)}
        >
          <RiArrowRightSLine />
        </Button>
      </nav>
    </div>
  )
}
