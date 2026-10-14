export type Consent = "accepted" | "declined"

const KEY = "cookie-consent"
const EVENT = "cookie-consent-change"

// Anything other than an explicit "accepted" (no choice yet, storage blocked)
// counts as no consent, so trackers never load by default.
export function getConsent(): Consent | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === "accepted" || value === "declined" ? value : null
  } catch {
    return null
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(KEY, value)
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }))
}

export function onConsentChange(callback: (value: Consent) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<Consent>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

const OPEN_EVENT = "cookie-settings-open"

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onCookieSettingsOpen(callback: () => void) {
  window.addEventListener(OPEN_EVENT, callback)
  return () => window.removeEventListener(OPEN_EVENT, callback)
}

// Clarity's first-party cookies. Third-party cookies (clarity.ms, x.com) can
// only be cleared by the visitor's browser.
const TRACKING_COOKIES = ["_clck", "_clsk"]

export function clearTrackingCookies() {
  const host = location.hostname
  const parent = host.split(".").slice(-2).join(".")
  for (const name of TRACKING_COOKIES) {
    for (const domain of ["", `; domain=${host}`, `; domain=.${parent}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`
    }
  }
}
