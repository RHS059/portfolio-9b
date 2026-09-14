"use client"

import { useEffect, useRef, useState } from "react"

import { HERO_NAME_REVEAL_EVENT } from "@/components/hero-section"

export const HERO_IMAGE_SRC = "/reid-slaughter-purple.webp"
export const HERO_NAME_ID = "hero-name"

// Below this width the hero portrait is never rendered, so there is nothing to wait on.
const DESKTOP_MIN_WIDTH = 1024
// Never trap the visitor behind the loader, even on a failed/slow image request.
const MAX_WAIT_MS = 3500
// Keeps the mark on screen long enough to read, and lets the hero fade-in settle
// so we measure its final resting position.
const MIN_VISIBLE_MS = 1300
const MORPH_MS = 950
const FADE_MS = 380

type Morph = { x: number; y: number; scale: number }

export default function PageLoader() {
  const [ready, setReady] = useState(false)
  const [morph, setMorph] = useState<Morph | null>(null)
  const [faded, setFaded] = useState(false)
  const [hidden, setHidden] = useState(false)
  const markRef = useRef<HTMLSpanElement>(null)

  // Wait for the hero image (desktop only) plus a minimum display time.
  useEffect(() => {
    let cancelled = false
    let imageDone = false
    let timeDone = false

    const settle = () => {
      if (!cancelled && imageDone && timeDone) setReady(true)
    }
    const onImage = () => {
      imageDone = true
      settle()
    }

    if (window.innerWidth < DESKTOP_MIN_WIDTH) {
      imageDone = true
    } else {
      const img = new Image()
      img.onload = onImage
      img.onerror = onImage
      img.src = HERO_IMAGE_SRC
      if (img.complete) imageDone = true
    }

    const minTimer = setTimeout(() => {
      timeDone = true
      settle()
    }, MIN_VISIBLE_MS)
    const safety = setTimeout(() => {
      imageDone = true
      timeDone = true
      settle()
    }, MAX_WAIT_MS)

    settle()
    return () => {
      cancelled = true
      clearTimeout(minTimer)
      clearTimeout(safety)
    }
  }, [])

  // Measure the hero headline and fly the mark onto it, then fade away.
  useEffect(() => {
    if (!ready) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const hero = document.getElementById(HERO_NAME_ID)
    const mark = markRef.current

    if (!reduced && hero && mark) {
      const from = mark.getBoundingClientRect()
      const to = hero.getBoundingClientRect()
      // Font-size ratio survives the hero headline wrapping onto two lines.
      const fromSize = Number.parseFloat(getComputedStyle(mark).fontSize) || 1
      const toSize = Number.parseFloat(getComputedStyle(hero).fontSize) || 1
      setMorph({ x: to.left - from.left, y: to.top - from.top, scale: toSize / fromSize })
    } else {
      setMorph({ x: 0, y: 0, scale: 1 })
    }

    const travel = reduced ? 0 : MORPH_MS
    const fadeTimer = setTimeout(() => {
      // Tell the hero to bring its real headline in as the mark dissolves.
      window.dispatchEvent(new Event(HERO_NAME_REVEAL_EVENT))
      setFaded(true)
    }, travel)
    const unmountTimer = setTimeout(() => setHidden(true), travel + FADE_MS)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(unmountTimer)
    }
  }, [ready])

  if (hidden) return null

  const flying = morph !== null

  return (
    <div
      aria-hidden={flying}
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      style={{ contain: "layout paint" }}
    >
      <style>{`
        @keyframes rs-sweep {
          0% { background-position: 200% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes rs-track {
          0% { transform: translateX(-100%) scaleX(0.35); }
          50% { transform: translateX(0%) scaleX(1); }
          100% { transform: translateX(100%) scaleX(0.35); }
        }
      `}</style>

      {/* Backdrop: near-black ultramarine violet */}
      <div
        className="absolute inset-0 bg-[#0B0718] transition-opacity duration-700 ease-out"
        style={{ opacity: flying ? 0 : 1, transitionDelay: flying ? "120ms" : "0ms" }}
      />

      <div
        role="status"
        aria-live="polite"
        aria-label={flying ? undefined : "Loading portfolio"}
        className="absolute inset-0 flex items-center justify-center px-6"
      >
        <div className="relative">
          {/* The mark that flies to the hero headline */}
          <span
            ref={markRef}
            className="relative block whitespace-nowrap font-sans text-4xl font-bold leading-none sm:text-5xl"
            style={{
              transformOrigin: "top left",
              transform: morph ? `translate3d(${morph.x}px, ${morph.y}px, 0) scale(${morph.scale})` : "none",
              transition: `transform ${MORPH_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${FADE_MS}ms linear`,
              opacity: faded ? 0 : 1,
              willChange: "transform, opacity",
            }}
          >
            {/* Dim base letters — brighten to solid white as the mark lands */}
            <span
              className="transition-colors duration-500 ease-out"
              style={{ color: flying ? "#ffffff" : "rgba(255,255,255,0.22)" }}
            >
              Reid Slaughter
            </span>

            {/* Light sweeping through the letters while loading */}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-clip-text text-transparent transition-opacity duration-300 ease-out"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, transparent 18%, #C9B6FF 38%, #FFFFFF 50%, #C9B6FF 62%, transparent 82%)",
                backgroundSize: "260% 100%",
                animation: flying ? "none" : "rs-sweep 1.9s linear infinite",
                opacity: flying ? 0 : 1,
              }}
            >
              Reid Slaughter
            </span>
          </span>

          {/* Indeterminate progress rule */}
          <span
            aria-hidden="true"
            className="absolute -bottom-5 left-0 right-0 h-px overflow-hidden bg-white/10 transition-opacity duration-200 ease-out"
            style={{ opacity: flying ? 0 : 1 }}
          >
            <span
              className="block h-px w-full bg-gradient-to-r from-transparent via-[#8B6CFF] to-transparent"
              style={{ animation: "rs-track 1.9s cubic-bezier(0.65, 0, 0.35, 1) infinite" }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
