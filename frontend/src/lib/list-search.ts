import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from "@/types/pagination"

// Validators for the URL search params backing each list screen. They normalize
// untyped `validateSearch` input and drop default/invalid values so the URL stays
// clean (page 1 and the default page size are simply omitted).

export function parsePage(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isInteger(n) && n > 1 ? n : undefined
}

export function parsePerPage(value: unknown): number | undefined {
  const n = Number(value)
  return (PER_PAGE_OPTIONS as readonly number[]).includes(n) && n !== DEFAULT_PER_PAGE
    ? n
    : undefined
}

export function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

export function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}
