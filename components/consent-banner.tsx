"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { getConsent, onConsentChange, setConsent, type Consent } from "@/lib/consent"

// Renders the cookie banner, and loads Clarity and Vercel Analytics only after
// the visitor clicks Accept. Nothing here runs during server rendering.
export default function ConsentBanner() {
  const [consent, setState] = useState<Consent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setState(getConsent())
    setReady(true)
    return onConsentChange(setState)
  }, [])

  if (!ready) return null

  if (consent === "accepted") {
    return (
      <>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "kg4cvt3xg0");
          `}
        </Script>
        <Analytics />
      </>
    )
  }

  if (consent === "declined") return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-lg bg-[#181425] p-4 text-white shadow-lg sm:flex sm:items-center sm:gap-4"
    >
      <p className="text-sm text-gray-300">
        This site uses cookies and analytics (Microsoft Clarity, Vercel Analytics, and embedded X posts) to understand
        how visitors use it. Nothing loads unless you accept.
      </p>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          onClick={() => setConsent("declined")}
          className="rounded-md px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setConsent("accepted")}
          className="rounded-md bg-[#685c84] px-3 py-2 text-sm font-semibold text-white hover:bg-[#3b2d56]"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
