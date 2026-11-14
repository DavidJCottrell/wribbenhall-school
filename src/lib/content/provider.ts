import type { CollectionData, CollectionName } from "./schema"

// Anything that can return a validated collection by name can back the site:
// local JSON today, a CDN-hosted JSON bucket or headless CMS later.
export interface ContentProvider {
  readonly name: string
  getCollection<K extends CollectionName>(collection: K): Promise<CollectionData<K>>
}
