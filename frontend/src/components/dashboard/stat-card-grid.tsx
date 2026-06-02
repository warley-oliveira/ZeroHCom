import type { ReactNode } from "react"

// 6-up on the widest screens, degrading gracefully down to a single column.
export function StatCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {children}
    </div>
  )
}
