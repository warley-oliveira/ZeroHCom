const CURRENCY_TO_LOCALE: Record<string, string> = {
  AUD: "en-AU",
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
}

export function formatMoney(amountCents: number, currency: string): string {
  const locale = CURRENCY_TO_LOCALE[currency] ?? "pt-BR"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountCents / 100)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso))
}
