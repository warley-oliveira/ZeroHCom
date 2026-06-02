import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import ptBR from "./locales/pt-BR"
import en from "./locales/en"

// Languages offered in the UI switcher. `code` must match a resources key below.
// We key by BASE language (pt/en) and use load:"languageOnly" so any region
// variant the browser reports (pt-BR, en-US, en-GB…) collapses onto these.
export const SUPPORTED_LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: ptBR },
      en: { translation: en },
    },
    fallbackLng: "en",
    supportedLngs: ["pt", "en"],
    // Collapse region codes (pt-BR -> pt, en-US -> en) onto the base bundles.
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      // Persisted choice wins; otherwise fall back to the browser language.
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "zhc.lang",
    },
  })

export default i18n
