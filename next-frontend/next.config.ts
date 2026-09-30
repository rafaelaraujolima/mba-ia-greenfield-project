import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // `/api/videos/{id}/thumbnail` is a same-origin BFF route that 302s to a
    // pre-signed STORAGE_PUBLIC_ENDPOINT URL. `next/image` follows the
    // redirect itself when optimizing, so only the local path needs
    // allow-listing here — the storage host it redirects to is never the
    // `src` next/image sees. `unoptimized` per-call (in
    // components/ui/video-thumbnail.tsx) is unnecessary: the BFF route
    // already enforces visibility (ready/published/public, or owner) before
    // redirecting, so there is no private thumbnail this config would expose.
    localPatterns: [
      {
        pathname: "/api/videos/**/thumbnail",
        search: "*",
      },
    ],
  },
};

export default nextConfig;
