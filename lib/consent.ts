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
