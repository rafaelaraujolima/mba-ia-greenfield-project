"use client"

import * as React from "react"

/**
 * Fires a fire-and-forget view-count registration on mount
 * (video-watch-page/TD-02). No visible output; the server already rendered
 * the page's `viewCount` from the count at request time, so this beacon
 * does not update anything on screen — it only informs the backend counter
 * for subsequent page loads.
 */
function ViewBeacon({ videoId }: { videoId: string }) {
  React.useEffect(() => {
    fetch(`/api/videos/${videoId}/views`, { method: "POST" }).catch(() => {
      // Best-effort — a failed view registration must never disrupt playback.
    })
  }, [videoId])

  return null
}

export { ViewBeacon }
