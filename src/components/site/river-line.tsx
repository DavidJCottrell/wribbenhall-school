import { cn } from "@/lib/utils"

const RIVER_PATH =
  "M-10 40 C 120 10, 230 70, 380 42 S 640 8, 800 38 S 1060 74, 1210 40 S 1450 6, 1610 34"

// The one bit of motion on the site: on the home page the river draws itself in once.
export function RiverLine({ className, animated = false, quiet = false }: { className?: string; animated?: boolean; quiet?: boolean }) {
  return (
    <svg
      viewBox="0 0 1600 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      fill="none"
    >
      <path
        d={RIVER_PATH}
        pathLength={1}
        stroke="currentColor"
        strokeWidth={quiet ? 2 : 5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={
          animated
            ? {
                strokeDasharray: 1,
                strokeDashoffset: 1,
                animation: "river-draw 1.8s cubic-bezier(0.65, 0, 0.35, 1) 0.2s forwards",
              }
            : undefined
        }
      />
    </svg>
  )
}
