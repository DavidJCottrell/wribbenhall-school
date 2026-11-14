import { ViewTransition } from "react"

// Lives in a template rather than the layout so it remounts on every navigation, which is what fires enter/exit.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  )
}
