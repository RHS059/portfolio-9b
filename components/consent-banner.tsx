"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import {
  clearTrackingCookies,
  getConsent,
  hasGlobalPrivacyControl,
  onConsentChange,
  onCookieSettingsOpen,
  setConsent,
  type Consent,
} from "@/lib/consent"

// Renders the cookie banner, and loads Clarity and Vercel Analytics only after
// the visitor clicks Accept. Nothing here runs during server rendering.
export default function ConsentBanner() {
  const [consent, setState] = useState<Consent | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [gpc, setGpc] = useState(false)

  useEffect(() => {
    setState(getConsent())
    setGpc(hasGlobalPrivacyControl())
    setReady(true)
    const offChange = onConsentChange(setState)
    const offOpen = onCookieSettingsOpen(() => setOpen(true))
    return () => {
      offChange()
      offOpen()
    }
  }, [])

  const choose = (value: Consent) => {
    const withdrawing = consent === "accepted" && value === "declined"
    setConsent(value)
    setOpen(false)
    // Loaded scripts cannot be unloaded, so clear their cookies and reload
    // into a page where they never start.
    if (withdrawing) {
      clearTrackingCookies()
      location.reload()
    }
  }

  if (!ready) return null

  return (
    <>
      {consent === "accepted" && (
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
      )}
      {(consent === null || open) && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-lg bg-[#181425] p-4 text-white shadow-lg sm:flex sm:items-center sm:gap-4"
        >
          <p className="text-sm text-gray-300">
            This site uses cookies and analytics (Microsoft Clarity, Vercel Analytics, and embedded X posts) to understand
            how visitors use it. Nothing loads unless you accept.{" "}
            {gpc ? (
              <>Your browser&apos;s Global Privacy Control signal is on, so tracking stays off. </>
            ) : (
              consent && <>You currently {consent === "accepted" ? "accept" : "decline"}. </>
            )}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
              Privacy policy
            </Link>
          </p>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button
              type="button"
              onClick={() => choose("declined")}
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
            >
              {gpc ? "Close" : "Decline"}
            </button>
            {!gpc && <button
              type="button"
              onClick={() => choose("accepted")}
              className="rounded-md bg-[#685c84] px-3 py-2 text-sm font-semibold text-white hover:bg-[#3b2d56]"
            >
              Accept
            </button>}
          </div>
        </div>
      )}
    </>
  )
}
