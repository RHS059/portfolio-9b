"use client"

import { useEffect, useState } from "react"

// Below this width the image is fully hidden; at/above the top width it is fully shown.
const FADE_START = 1024 // small desktop / lg — image fully transparent
const FADE_END = 1280 // desktop / xl — image fully opaque

function getBackgroundOpacity(width: number) {
  if (width <= FADE_START) return 0
  if (width >= FADE_END) return 1
  return (width - FADE_START) / (FADE_END - FADE_START)
}

const LOAD_FADE_MS = 2200 // slow initial fade-in on page load

// The loader flies its wordmark onto the headline and announces when it lands.
export const HERO_NAME_REVEAL_EVENT = "rs:hero-name-reveal"
// Reveal the headline no matter what, in case the loader never announces.
const REVEAL_FALLBACK_MS = 5000

const METRICS = [
  { value: "90%", label: "faster support ticket resolution" },
  { value: "92%", label: "reduction in onboarding time" },
  { value: "80%", label: "faster customer upgrades" },
  { value: "4.4★", label: "app store rating, 5k+ downloads" },
]

// Grain: fractal noise laid over the portrait so it reads like film, not a flat render.
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")"

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [bgOpacity, setBgOpacity] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [slowFade, setSlowFade] = useState(true)
  const [nameRevealed, setNameRevealed] = useState(false)
  const [flashMetrics, setFlashMetrics] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    const updateOpacity = () => setBgOpacity(getBackgroundOpacity(window.innerWidth))
    updateOpacity()
    window.addEventListener("resize", updateOpacity)
    return () => window.removeEventListener("resize", updateOpacity)
  }, [])

  useEffect(() => {
    // Kick off the slow fade-in on the next frame so the transition animates from 0.
    const raf = requestAnimationFrame(() => setLoaded(true))
    // After the initial fade completes, switch to a snappy transition for resizes.
    const timer = setTimeout(() => setSlowFade(false), LOAD_FADE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [])

  // Hold the headline hidden until the loader's mark has finished travelling onto it,
  // then run the metrics through a gold flash.
  useEffect(() => {
    const reveal = () => setNameRevealed(true)
    window.addEventListener(HERO_NAME_REVEAL_EVENT, reveal)
    const fallback = setTimeout(reveal, REVEAL_FALLBACK_MS)
    return () => {
      window.removeEventListener(HERO_NAME_REVEAL_EVENT, reveal)
      clearTimeout(fallback)
    }
  }, [])

  useEffect(() => {
    if (!nameRevealed) return
    const timer = setTimeout(() => setFlashMetrics(true), 420)
    return () => clearTimeout(timer)
  }, [nameRevealed])

  return (
    <section
      id="hero"
      className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative z-10 min-h-screen flex items-center bg-black overflow-hidden"
    >
      <style>{`
        @keyframes rs-metric-flash {
          0% { color: #ffffff; text-shadow: none; }
          22% { color: #FFC55A; text-shadow: 0 0 18px rgba(255, 197, 90, 0.45); }
          100% { color: #ffffff; text-shadow: none; }
        }
      `}</style>

      {/* Desktop-only portrait background that fades with viewport width */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-[url('/reid-slaughter-purple.webp')] bg-cover bg-right bg-no-repeat transition-opacity ease-out ${slowFade ? "duration-[2200ms]" : "duration-150"}`}
        style={{ opacity: loaded ? bgOpacity : 0 }}
      />
      {/* Film grain over the portrait */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity ease-out ${slowFade ? "duration-[2200ms]" : "duration-150"}`}
        style={{
          backgroundImage: GRAIN_URL,
          backgroundSize: "180px 180px",
          opacity: loaded ? bgOpacity * 0.3 : 0,
        }}
      />
      <div className="max-w-6xl mx-auto w-full relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Column A: Name, tagline, proof */}
          <div
            className={`lg:w-1/2 text-left mb-8 lg:mb-0 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            {/* Kept in layout (opacity only) so the loader can measure where to land. */}
            <h1
              id="hero-name"
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 transition-opacity duration-300 ease-out"
              style={{ opacity: nameRevealed ? 1 : 0 }}
            >
              Reid Slaughter
            </h1>
            <h2 className="text-2xl sm:text-3xl text-white/90 mb-8 font-light">
              UX designer turning user insights into measurable business outcomes
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-12">
              {METRICS.map((metric, i) => (
                <div key={metric.value}>
                  <p
                    className="text-3xl font-bold text-white"
                    style={
                      flashMetrics
                        ? { animation: `rs-metric-flash 1200ms ease-out ${i * 110}ms both` }
                        : undefined
                    }
                  >
                    {metric.value}
                  </p>
                  <p className="text-white/70 text-sm">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Company logos */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
              <img
                src="/collective-data-logo.png"
                alt="Collective Data"
                className="h-12 w-auto object-contain opacity-90"
              />
              <img src="/teal-hq-logo.png" alt="Teal HQ" className="h-12 w-auto object-contain opacity-90" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
