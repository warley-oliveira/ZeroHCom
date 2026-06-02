import { RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/ThemeContext"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === "dark"
  // The label describes the action (what a click does), not the current state.
  const label = t(isDark ? "theme.switchToLight" : "theme.switchToDark")

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <RiSunLine /> : <RiMoonLine />}
    </Button>
  )
}
