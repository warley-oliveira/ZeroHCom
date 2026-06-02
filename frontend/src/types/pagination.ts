// Shape of the `meta` block the API returns alongside every paginated index.
export interface PaginationMeta {
  page: number
  per_page: number
  count: number
  pages: number
  next_page: number | null
  prev_page: number | null
}

// Envelope every paginated index endpoint returns: { data, meta }.
export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

// Page-size options offered in the pagination control. The API clamps to 100.
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_PER_PAGE = 25
