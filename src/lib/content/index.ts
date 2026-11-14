import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import type { ContentProvider } from "./provider"
import { localProvider } from "./providers/local"
import { createRemoteProvider } from "./providers/remote"
import type { CollectionData, CollectionName } from "./schema"

function resolveProvider(): ContentProvider {
  const baseUrl = process.env.CONTENT_BASE_URL
  if (baseUrl) {
    return createRemoteProvider(baseUrl, process.env.CONTENT_API_TOKEN)
  }
  return localProvider
}

const provider = resolveProvider()

async function load<K extends CollectionName>(collection: K): Promise<CollectionData<K>> {
  "use cache"
  cacheLife("hours")
  // Tag matches the collection name so a CMS webhook can call revalidateTag("events") etc.
  cacheTag(collection)
  return provider.getCollection(collection)
}

export const getSchool = () => load("school")
export const getEvents = () => load("events")
export const getAcademicYears = () => load("academicYears")
export const getPolicies = () => load("policies")
export const getGalleryAlbums = () => load("gallery")
export const getVacancies = () => load("vacancies")

export async function getVacancy(slug: string) {
  const vacancies = await getVacancies()
  return vacancies.find((vacancy) => vacancy.slug === slug)
}

export type * from "./schema"
