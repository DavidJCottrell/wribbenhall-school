import type { Metadata } from "next"

import { GalleryBrowser } from "@/components/gallery/gallery-browser"
import { PageHeader } from "@/components/site/page-header"
import { getGalleryAlbums } from "@/lib/content"

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from forest school, trips, sports day and everyday life at Wribbenhall School.",
}

export default async function GalleryPage() {
  const albums = await getGalleryAlbums()
  const sorted = [...albums].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader title="Gallery">
        <p>
          A look at school life, from the woods and the river to the classroom. We only share photos of pupils whose
          families have given permission.
        </p>
      </PageHeader>
      <div className="container-page py-12 md:py-16">
        <GalleryBrowser albums={sorted} />
      </div>
    </>
  )
}
