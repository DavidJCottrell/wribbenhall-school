import type { NextConfig } from "next"
import type { RemotePattern } from "next/dist/shared/lib/image-config"

function mediaRemotePatterns(): RemotePattern[] {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  if (!base) return []

  const url = new URL(base)
  return [
    {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, "")}/**`,
    },
  ]
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Leaves room for a 5 MB CV upload plus the rest of the job application
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    localPatterns: [{ pathname: "/media/**", search: "" }],
    remotePatterns: mediaRemotePatterns(),
    qualities: [75, 85],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
