import Link from "next/link"

import { getSchool } from "@/lib/content"

import { LogoMark } from "./logo"
import { mainNavigation } from "./navigation"

export async function SiteFooter() {
  const school = await getSchool()

  return (
    <footer className="mt-auto bg-severn-deep text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <LogoMark className="text-white" />
            <p className="font-display text-2xl">{school.name}</p>
          </div>
          <p className="mt-5 max-w-sm text-white/80">{school.shortDescription}</p>
        </div>

        <div className="md:col-span-4">
          <h2 className="font-sans text-base font-semibold">Find us</h2>
          <address className="mt-3 not-italic text-white/85">
            {school.address.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="block">{school.address.postcode}</span>
          </address>
          <p className="mt-4">
            <a className="underline decoration-buttercup decoration-2 underline-offset-4" href={`tel:${school.phone.replace(/\s/g, "")}`}>
              {school.phone}
            </a>
            <br />
            <a className="underline decoration-buttercup decoration-2 underline-offset-4" href={`mailto:${school.email}`}>
              {school.email}
            </a>
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="font-sans text-base font-semibold">Pages</h2>
          <ul className="mt-3 space-y-2 text-white/85">
            {mainNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={school.ofstedUrl} className="hover:text-white hover:underline" rel="noopener" target="_blank">
                Ofsted reports
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-white/70 sm:flex-row sm:justify-between">
          <p>{school.name}, Bewdley, Worcestershire</p>
          <p>
            Need this information in another format?{" "}
            <Link href="/contact" className="underline underline-offset-4 hover:text-white">
              Ask the school office
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
