import { RiTranslate2 } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SUPPORTED_LANGUAGES } from "@/i18n"

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  // The resolved UI language ("en-US" → "en"), matched against our codes.
  const current =
    SUPPORTED_LANGUAGES.find((l) => i18n.resolvedLanguage === l.code) ??
    SUPPORTED_LANGUAGES.find((l) => i18n.resolvedLanguage?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("language.label")}>
          <RiTranslate2 />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => void i18n.changeLanguage(lang.code)}
            data-active={lang.code === current.code}
            className="data-[active=true]:font-medium"
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
