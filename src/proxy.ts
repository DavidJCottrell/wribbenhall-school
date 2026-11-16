import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

// Optimistic redirect only. It checks the cookie exists, not that it is valid.
// Real authorisation happens in requireUser() next to the data.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next()

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: "/portal/:path*",
}
