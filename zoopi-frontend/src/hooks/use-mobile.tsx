import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const val = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile((prev) => (prev !== val ? val : prev))
    }
    mql.addEventListener("change", onChange)
    const initial = window.innerWidth < MOBILE_BREAKPOINT
    setIsMobile(initial)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
