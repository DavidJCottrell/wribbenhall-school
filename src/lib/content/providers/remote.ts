import "server-only"

import type { ContentProvider } from "../provider"
import { collections, type CollectionName } from "../schema"

// Expects one JSON file per collection at `${baseUrl}/${file}`, matching the
// shapes in src/content/*.json. Works with any static host or CDN bucket.
const fileNames: Record<CollectionName, string> = {
  school: "school.json",
  events: "events.json",
  academicYears: "academic-years.json",
  policies: "policies.json",
  gallery: "gallery.json",
  vacancies: "vacancies.json",
}

export function createRemoteProvider(baseUrl: string, token?: string): ContentProvider {
  const root = baseUrl.replace(/\/+$/, "")

  return {
    name: "remote",
    async getCollection(collection) {
      const url = `${root}/${fileNames[collection]}`
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        throw new Error(`Content request failed: ${response.status} ${url}`)
      }

      return collections[collection].parse(await response.json()) as never
    },
  }
}
