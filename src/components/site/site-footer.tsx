import Link from "next/link"

import { getSchool } from "@/lib/content"

import { LogoMark } from "./logo"
import { mainNavigation } from "./navigation"

export async function SiteFooter() {
  const school = await getSchool()

  return (
    <footer className="mt-auto bg-panel-deep panel-edge text-panel-foreground">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-white">
              <LogoMark className="h-10" />
            </span>
            <p className="font-display text-2xl">{school.name}</p>
          </div>
          <p className="mt-5 max-w-sm text-panel-foreground/80">{school.shortDescription}</p>
        </div>

        <div className="md:col-span-4">
          <h2 className="font-sans text-base font-semibold">Find us</h2>
          <address className="mt-3 not-italic text-panel-foreground/85">
            {school.address.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="block">{school.address.postcode}</span>
          </address>
          <a
            href={school.address.mapUrl}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-block underline decoration-buttercup decoration-2 underline-offset-4"
          >
            Open in a map
          </a>
          <p className="mt-4">
            <a className="underline decoration-buttercup decoration-2 underline-offset-4" href={`tel:${school.phone.replace(/\s/g, "")}`}>
              {school.phone}
            </a>
            <br />
            <a className="break-all underline decoration-buttercup decoration-2 underline-offset-4" href={`mailto:${school.email}`}>
              {school.email}
            </a>
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="font-sans text-base font-semibold">Pages</h2>
          <ul className="mt-3 space-y-2 text-panel-foreground/85">
            {mainNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-panel-foreground hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/policies#inspections" className="hover:text-panel-foreground hover:underline">
                Inspection reports
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-panel-foreground/15">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-panel-foreground/70 sm:flex-row sm:justify-between">
          <p>
            © {school.name}
            {school.vatNumber ? `. VAT number ${school.vatNumber}` : null}
          </p>
          <p>
            Need this information in another format?{" "}
            <Link href="/contact" className="underline underline-offset-4 hover:text-panel-foreground">
              Ask the school office
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
