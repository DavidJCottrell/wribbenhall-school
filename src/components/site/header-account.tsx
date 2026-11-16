"use client"

import { LayoutDashboardIcon, LogInIcon, LogOutIcon } from "lucide-react"
import Link from "next/link"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/auth-client"

function useSignOut() {
  const [pending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
      await authClient.signOut()
      // A full page load, on purpose: it also drops any private pages the router has cached for this browser.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/")
    })
  }

  return { signOut, pending }
}

// Pages stay static, so the signed-in state is read in the browser once the page has loaded.
export function HeaderAccountButtons() {
  const { data: session, isPending } = authClient.useSession()
  const { signOut, pending } = useSignOut()

  if (isPending) {
    // Same size as the real button, so the header doesn't shift when the state arrives.
    return (
      <Button variant="ghost" className="invisible max-sm:hidden" tabIndex={-1} aria-hidden="true">
        <LogInIcon aria-hidden="true" />
        Log in
      </Button>
    )
  }

  if (!session) {
    return (
      <Button asChild variant="ghost" className="max-sm:hidden">
        <Link href="/login">
          <LogInIcon aria-hidden="true" />
          Log in
        </Link>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1 max-sm:hidden">
      <Button asChild variant="ghost">
        <Link href="/portal" prefetch={false}>
          <LayoutDashboardIcon aria-hidden="true" />
          Portal
        </Link>
      </Button>
      <Button type="button" variant="ghost" onClick={signOut} disabled={pending}>
        <LogOutIcon aria-hidden="true" />
        {pending ? "Logging out" : "Log out"}
      </Button>
    </div>
  )
}

const mobileItemClass = "flex w-full items-center gap-3 py-4 text-left text-lg text-ink/80"

export function MobileAccountItems({ onNavigate }: { onNavigate: () => void }) {
  const { data: session } = authClient.useSession()
  const { signOut, pending } = useSignOut()

  if (!session) {
    return (
      <li className="border-t border-border">
        <Link href="/login" onClick={onNavigate} className={mobileItemClass}>
          <span aria-hidden="true" className="h-5 w-1 rounded-full bg-transparent" />
          Parent and staff log in
        </Link>
      </li>
    )
  }

  return (
    <>
      <li className="border-t border-border">
        <Link href="/portal" prefetch={false} onClick={onNavigate} className={mobileItemClass}>
          <span aria-hidden="true" className="h-5 w-1 rounded-full bg-transparent" />
          Portal
        </Link>
      </li>
      <li className="border-t border-border">
        <button type="button" onClick={signOut} disabled={pending} className={mobileItemClass}>
          <span aria-hidden="true" className="h-5 w-1 rounded-full bg-transparent" />
          {pending ? "Logging out" : "Log out"}
        </button>
      </li>
    </>
  )
}
