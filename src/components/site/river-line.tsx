import { cn } from "@/lib/utils"

const RIVER_PATH =
  "M-10 40 C 120 10, 230 70, 380 42 S 640 8, 800 38 S 1060 74, 1210 40 S 1450 6, 1610 34"

type RiverDraw = "none" | "load" | "scroll"

// The river is revealed left to right: on load, or progressively as it scrolls into view.
// A clip is used rather than a stroke dash because dash lengths drift with non-scaling strokes on a stretched SVG.
export function RiverLine({ className, draw = "none", quiet = false }: { className?: string; draw?: RiverDraw; quiet?: boolean }) {
  return (
    <svg
      viewBox="0 0 1600 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none", draw === "scroll" && "river-scroll", className)}
      fill="none"
      style={
        draw === "load"
          ? { animation: "river-draw 1.8s cubic-bezier(0.65, 0, 0.35, 1) 0.2s backwards" }
          : undefined
      }
    >
      <path
        d={RIVER_PATH}
        stroke="currentColor"
        strokeWidth={quiet ? 2 : 5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
