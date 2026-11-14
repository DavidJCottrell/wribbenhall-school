import "server-only"

import academicYears from "@/content/academic-years.json"
import events from "@/content/events.json"
import gallery from "@/content/gallery.json"
import policies from "@/content/policies.json"
import school from "@/content/school.json"
import vacancies from "@/content/vacancies.json"

import type { ContentProvider } from "../provider"
import { collections, type CollectionName } from "../schema"

const sources: Record<CollectionName, unknown> = {
  school,
  events,
  academicYears,
  policies,
  gallery,
  vacancies,
}

export const localProvider: ContentProvider = {
  name: "local",
  async getCollection(collection) {
    return collections[collection].parse(sources[collection]) as never
  },
}
