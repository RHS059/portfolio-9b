"use client"

import { useState } from "react"

interface ProjectHeroProps {
  company: string
  dateShipped: string
  title: string
  heroImage: {
    src: string
    alt: string
  }
  role: string
  timeline: string
  team: string
  responsibilities: string
  tools: string
  aiTools?: string
  prototypeHref?: string
  outcome: string
}

export default function ProjectHero({
  company,
  dateShipped,
  title,
  heroImage,
  role,
  timeline,
  team,
  responsibilities,
  tools,
  aiTools,
  outcome,
  prototypeHref,
}: ProjectHeroProps) {
  const [isHovered, setIsHovered] = useState(false)

  const [isOpen, setIsOpen] = useState(false)
  const showPrototype = isHovered || isOpen

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Meta Line */}
      <p className="text-xs uppercase tracking-wide text-gray-600">
        {company} – {dateShipped}
      </p>

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-semibold text-[#181425] leading-tight">{title}</h1>

      {/* Hero Image */}
      <div className="mx-auto max-w-[911px]">
        {prototypeHref ? (
          <div
            className="relative overflow-hidden rounded-lg shadow-lg"
            onPointerEnter={(event) => { if (event.pointerType === "mouse") setIsHovered(true) }}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") setIsHovered(false) }}
            onFocus={(event) => { if (event.target.matches(":focus-visible")) setIsHovered(true) }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsHovered(false)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setIsOpen(false); setIsHovered(false) }
            }}
          >
            <button
              type="button"
              aria-label="Show the 2026 Fleet Management prototype"
              aria-expanded={showPrototype}
              aria-controls="fleet-prototype-overlay"
              onClick={() => setIsOpen((open) => !open)}
              className="block w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
            >
              <img src={heroImage.src} alt={heroImage.alt} className="block w-full h-auto" />
            </button>
            <div
              id="fleet-prototype-overlay"
              className={`absolute inset-0 flex items-center justify-center bg-black/75 p-4 text-center text-white pointer-events-none transition-opacity duration-200 motion-reduce:transition-none ${showPrototype ? "visible opacity-100" : "invisible opacity-0"}`}
            >
              <p className="text-sm md:text-base leading-relaxed">
                This work was originally done 2019–2022.
                <br />
                <a href={prototypeHref} className="pointer-events-auto inline-block py-2 font-semibold underline underline-offset-4 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  View the 2026 Prototype here
                </a>
                <br />
                to get an idea of my current skills! 👍
              </p>
            </div>
          </div>
        ) : (
          <img src={heroImage.src || "/placeholder.svg"} alt={heroImage.alt} className="w-full h-auto max-h-[512px] object-cover rounded-lg shadow-lg" />
        )}

      </div>

      {/* Project facts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          ["Role", role],
          ["Responsibilities", responsibilities],
          ["Tools", tools],
          ...(aiTools ? [["AI Tools", aiTools]] : []),
          ["Team", team],
          ["Timeline", timeline],
          ["Outcome", outcome],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">{label}</p>
            <p className="text-sm md:text-base text-[#181425]">{value}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
