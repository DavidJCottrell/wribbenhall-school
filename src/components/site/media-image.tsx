import Image, { type ImageProps } from "next/image"

import type { MediaAsset } from "@/lib/content/schema"
import { mediaUrl } from "@/lib/media"

type MediaImageProps = Omit<ImageProps, "src" | "alt" | "width" | "height"> & {
  asset: MediaAsset
}

export function MediaImage({ asset, fill, ...props }: MediaImageProps) {
  if (fill) {
    return <Image src={mediaUrl(asset.key)} alt={asset.alt} fill {...props} />
  }
  return <Image src={mediaUrl(asset.key)} alt={asset.alt} width={asset.width} height={asset.height} {...props} />
}
