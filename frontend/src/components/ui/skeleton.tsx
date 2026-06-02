import * as React from "react"

import { cn } from "@/lib/utils"

// forwardRef for React 18 (Shadcn v4 ships ref-as-prop / React 19 style).
const Skeleton = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="skeleton"
        className={cn("bg-accent animate-pulse rounded-md", className)}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
