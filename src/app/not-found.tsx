import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container-page py-24 md:py-32">
      <h1 className="text-title">We can&apos;t find that page</h1>
      <p className="mt-5 measure text-lead text-muted-foreground">
        It may have moved, or the link might have a typing mistake. Try the home page, or contact the school office if
        you were looking for something specific.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/">Go to the home page</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Contact the office</Link>
        </Button>
      </div>
    </div>
  )
}
