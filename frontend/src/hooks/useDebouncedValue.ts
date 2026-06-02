import { useEffect, useState } from "react"

// Returns a debounced copy of `value` that only updates after `delay` ms of
// quiescence. Used to throttle search inputs before they hit the URL/query.
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])

  return debounced
}
