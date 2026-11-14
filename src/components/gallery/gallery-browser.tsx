"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { GalleryAlbum } from "@/lib/content/schema"
import { formatMedium } from "@/lib/dates"
import { mediaUrl } from "@/lib/media"

const ALL = "all"

type Viewing = { albumId: string; index: number }

export function GalleryBrowser({ albums }: { albums: GalleryAlbum[] }) {
  const [filter, setFilter] = useState<string>(ALL)
  const [viewing, setViewing] = useState<Viewing | null>(null)

  const shownAlbums = filter === ALL ? albums : albums.filter((album) => album.id === filter)
  const viewingAlbum = viewing ? albums.find((album) => album.id === viewing.albumId) : undefined
  const viewingImage = viewingAlbum && viewing ? viewingAlbum.images[viewing.index] : undefined

  function step(offset: number) {
    if (!viewing || !viewingAlbum) return
    const count = viewingAlbum.images.length
    setViewing({ ...viewing, index: (viewing.index + offset + count) % count })
  }

  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={filter}
        onValueChange={(value) => setFilter(value || ALL)}
        aria-label="Choose an album"
        className="flex w-full flex-wrap justify-start gap-2 shadow-none"
      >
        <ToggleGroupItem value={ALL} className="h-10 flex-none rounded-full! border px-4 data-[state=on]:bg-ink data-[state=on]:text-white">
          All albums
        </ToggleGroupItem>
        {albums.map((album) => (
          <ToggleGroupItem
            key={album.id}
            value={album.id}
            className="h-10 flex-none rounded-full! border px-4 data-[state=on]:bg-ink data-[state=on]:text-white"
          >
            {album.title}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="mt-12 space-y-20">
        {shownAlbums.map((album, albumIndex) => (
          <section key={album.id} aria-labelledby={`album-${album.id}`}>
            <div className="grid gap-2 md:grid-cols-12 md:items-end">
              <div className="md:col-span-8">
                <h2 id={`album-${album.id}`} className="text-heading">
                  {album.title}
                </h2>
                <p className="mt-2 max-w-2xl text-ink/85">{album.description}</p>
              </div>
              <p className="text-muted-foreground md:col-span-4 md:text-right">
                {album.date ? (
                  <>
                    <time dateTime={album.date}>{formatMedium(album.date)}</time>,{" "}
                  </>
                ) : null}
                {album.images.length} photos
              </p>
            </div>

            <ul className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {album.images.map((image, index) => (
                <li key={image.key} className="mb-4 break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setViewing({ albumId: album.id, index })}
                    className="group block w-full overflow-hidden rounded-lg bg-secondary text-left"
                  >
                    <Image
                      src={mediaUrl(image.key)}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                      loading={albumIndex === 0 && index < 3 ? "eager" : "lazy"}
                      className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <span className="sr-only">Open larger photo</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={Boolean(viewingImage)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent
          className="max-w-[min(72rem,calc(100vw-2rem))] gap-0 overflow-hidden border-0 bg-ink p-0 text-white sm:max-w-[min(72rem,calc(100vw-2rem))]"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1)
            if (event.key === "ArrowLeft") step(-1)
          }}
        >
          {viewingImage && viewingAlbum && viewing ? (
            <>
              <div className="relative h-[min(70vh,48rem)] w-full bg-black/40">
                <Image
                  key={viewingImage.key}
                  src={mediaUrl(viewingImage.key)}
                  alt={viewingImage.alt}
                  fill
                  sizes="(min-width: 1200px) 72rem, 100vw"
                  className="object-contain"
                  quality={85}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <DialogTitle className="font-sans text-base font-semibold">
                    {viewingImage.caption ?? viewingImage.alt}
                  </DialogTitle>
                  <DialogDescription className="text-white/70">
                    {viewingAlbum.title}, photo {viewing.index + 1} of {viewingAlbum.images.length}
                  </DialogDescription>
                </div>
                <div className="flex gap-2 pr-8 sm:pr-10">
                  <Button variant="secondary" size="icon" onClick={() => step(-1)} aria-label="Previous photo">
                    <ChevronLeftIcon />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => step(1)} aria-label="Next photo">
                    <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
