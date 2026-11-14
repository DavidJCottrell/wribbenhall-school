import Image from "next/image"

import { mediaUrl } from "@/lib/media"
import { cn } from "@/lib/utils"

// The school's tree, cut from the original logo without its lettering.
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={mediaUrl("site/logo-tree.png")}
      alt=""
      width={480}
      height={428}
      sizes="48px"
      priority
      className={cn("h-10 w-auto", className)}
    />
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="font-display text-lg leading-none tracking-tight whitespace-nowrap sm:text-[1.375rem]">
        Wribbenhall School
      </span>
    </span>
  )
}
