"use client"

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
  prototypeLabel?: string
  prototypeNote?: string
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
  prototypeLabel = "Open the live prototype",
  prototypeNote,
}: ProjectHeroProps) {
  return (
    <div className="space-y-8 md:space-y-10">
      {/* Meta Line */}
      <p className="text-xs uppercase tracking-wide text-gray-600">
        {company} – {dateShipped}
      </p>

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-semibold text-[#181425] leading-tight">{title}</h1>

      {/* Hero Image */}
      <div className={prototypeHref ? "w-full" : "mx-auto max-w-[911px]"}>
        {prototypeHref ? (
          <figure className="space-y-3">
            <a
              href={prototypeHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${prototypeLabel} (opens in a new tab)`}
              className="group relative block overflow-hidden rounded-lg shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
            >
              <img src={heroImage.src} alt={heroImage.alt} className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs md:text-sm font-semibold text-[#181425] shadow-md transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                {prototypeLabel} <span aria-hidden="true">↗</span>
              </span>
            </a>
{prototypeNote && <figcaption className="text-sm text-gray-600">{prototypeNote}</figcaption>}
          </figure>
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
