import type { ReactNode } from "react"

// Where the colours come from: the --chart-* tokens in globals.css. Series colours are marks only. Text stays in text colours.

export type Series = "attended" | "authorised" | "unauthorised"

export const SERIES_LABELS: Record<Series, string> = {
  attended: "Attended",
  authorised: "Authorised absence",
  unauthorised: "Unauthorised absence",
}

export const seriesFill = (series: Series) => `var(--chart-${series}-fill)`

// Hatching, used instead of colour in the high-contrast scheme, where every brand colour is yellow.
// Rendered once per page. Lines run at 45 and 135 degrees only, so they never read as gridlines.
export function ChartPatterns() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <pattern id="chart-hatch-authorised" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#000000" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffe600" strokeWidth="3" />
        </pattern>
        <pattern id="chart-hatch-unauthorised" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
          <rect width="6" height="6" fill="#000000" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ff7a70" strokeWidth="3" />
        </pattern>
      </defs>
    </svg>
  )
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Key">
      {series.map((name) => (
        <li key={name} className="flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true" focusable="false">
            <rect width="12" height="12" rx="2" style={{ fill: seriesFill(name) }} />
          </svg>
          <span>{SERIES_LABELS[name]}</span>
        </li>
      ))}
    </ul>
  )
}

// Every chart has a table twin, so no value depends on seeing colour or using a pointer.
export function TableView({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer underline underline-offset-4">View as a table</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {headers.map((header) => (
                <th key={header} scope="col" className="py-2 pr-4 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border last:border-0">
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row" className="py-2 pr-4 font-medium whitespace-nowrap">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex} className="py-2 pr-4">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
