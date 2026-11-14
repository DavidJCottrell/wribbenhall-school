import Image from "next/image"

import type { School } from "@/lib/content/schema"
import { mediaUrl } from "@/lib/media"

type PartnerLogosProps = {
  partners: School["partners"]
}

// Logos sit on white tiles so they stay legible in every colour scheme.
export function PartnerLogos({ partners }: PartnerLogosProps) {
  return (
    <section aria-labelledby="partners" className="border-y border-border bg-card">
      <div className="container-page py-16 md:py-20">
        <h2 id="partners" className="text-title">
          Our partners and accreditations
        </h2>
        <p className="mt-4 max-w-prose text-lg text-ink/85">
          The organisations we work with and the recognition we are proud to hold.
        </p>
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {partners.map((partner) => (
            <li key={partner.name} className="flex flex-col overflow-hidden rounded-xl border border-border bg-white">
              <div className="grid flex-1 place-items-center p-6">
                <Image
                  src={mediaUrl(partner.logo.key)}
                  alt={partner.logo.alt}
                  width={partner.logo.width}
                  height={partner.logo.height}
                  sizes="(min-width: 768px) 14rem, 40vw"
                  className="h-24 w-auto max-w-full object-contain"
                />
              </div>
              <p className="border-t border-stone bg-stone/40 px-4 py-3 text-center text-sm font-semibold text-black">
                {partner.relationship}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
