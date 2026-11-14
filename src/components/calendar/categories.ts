import type { EventCategory } from "@/lib/content/schema"

export const eventCategories: Record<EventCategory, { label: string; swatch: string; chip: string }> = {
  term: {
    label: "Holidays and term dates",
    swatch: "bg-severn",
    chip: "bg-severn text-white",
  },
  inset: {
    label: "Training days",
    swatch: "bg-ink",
    chip: "bg-ink text-white",
  },
  parents: {
    label: "For parents",
    swatch: "bg-buttercup",
    chip: "bg-buttercup text-ink",
  },
  school: {
    label: "In school",
    swatch: "bg-wyre",
    chip: "bg-wyre text-white",
  },
  community: {
    label: "Open to all",
    swatch: "bg-[#4f7fa8]",
    chip: "bg-[#4f7fa8] text-white",
  },
}

export const categoryOrder: EventCategory[] = ["term", "inset", "parents", "school", "community"]
