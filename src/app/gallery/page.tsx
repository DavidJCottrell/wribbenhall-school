import type { Metadata } from "next"

import { GalleryBrowser } from "@/components/gallery/gallery-browser"
import { PageHeader } from "@/components/site/page-header"
import { getGalleryAlbums } from "@/lib/content"

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos of Wribbenhall School, our activities and the Wyre Forest.",
}

export default async function GalleryPage() {
  const albums = await getGalleryAlbums()

  return (
    <>
      <PageHeader title="Gallery">
        <p>
          A look around the house and garden at Crundalls Lane, our days out, and the Wyre Forest on our doorstep.
        </p>
      </PageHeader>
      <div className="container-page py-12 md:py-16">
        <GalleryBrowser albums={albums} />
      </div>
    </>
  )
}
