"use client"

import { openCookieSettings } from "@/lib/consent"

// Falls back to the privacy page's cookie section if JavaScript is unavailable.
export default function CookieSettingsLink() {
  return (
    <a
      href="/privacy#cookies"
      onClick={(event) => {
        event.preventDefault()
        openCookieSettings()
      }}
    >
      Cookie settings
    </a>
  )
}
