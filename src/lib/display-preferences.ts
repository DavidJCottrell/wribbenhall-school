export const textSizes = ["default", "large", "extra-large"] as const
export const colourSchemes = ["default", "high-contrast"] as const

export type TextSize = (typeof textSizes)[number]
export type ColourScheme = (typeof colourSchemes)[number]

export const STORAGE_KEY = "wribbenhall-display"
export const CHANGE_EVENT = "wribbenhall-display-change"

const isTextSize = (value: unknown): value is TextSize => textSizes.includes(value as TextSize)
const isColourScheme = (value: unknown): value is ColourScheme => colourSchemes.includes(value as ColourScheme)

// Runs before first paint (see layout.tsx) so the saved choice never flashes the default look.
export const applySavedPreferencesScript = `try{var p=JSON.parse(localStorage.getItem("${STORAGE_KEY}")||"{}");var d=document.documentElement;if(p.textSize&&p.textSize!=="default")d.dataset.textSize=p.textSize;if(p.colourScheme&&p.colourScheme!=="default")d.dataset.colourScheme=p.colourScheme}catch(e){}`

// The <html> data attributes are the single source of truth; storage only restores them on the next visit.
export function readTextSize(): TextSize {
  const value = document.documentElement.dataset.textSize
  return isTextSize(value) ? value : "default"
}

export function readColourScheme(): ColourScheme {
  const value = document.documentElement.dataset.colourScheme
  return isColourScheme(value) ? value : "default"
}

export function savePreferences(next: { textSize: TextSize; colourScheme: ColourScheme }) {
  const root = document.documentElement
  for (const [attribute, value] of [
    ["textSize", next.textSize],
    ["colourScheme", next.colourScheme],
  ] as const) {
    if (value === "default") delete root.dataset[attribute]
    else root.dataset[attribute] = value
  }

  try {
    if (next.textSize === "default" && next.colourScheme === "default") localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
