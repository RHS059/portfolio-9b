import type { Metadata } from "next"
import Link from "next/link"
import StructuredData from "../../components/structured-data"

export const metadata: Metadata = {
  title: "About Reid Slaughter | Product Designer & Design Engineer",
  description: "About Reid Slaughter, a product designer and design engineer working across UX, AI-assisted product development, prototyping, and front-end implementation.",
  alternates: { canonical: "/about" },
}

const person = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": "Person",
    "@id": "https://www.reidhslaughter.com/#reid-slaughter",
    name: "Reid Slaughter",
    url: "https://www.reidhslaughter.com/about",
    image: "https://www.reidhslaughter.com/reid-slaughter-purple.webp",
    jobTitle: "Product Designer & Design Engineer",
    description: "Product designer and design engineer working across UX, AI-assisted product development, prototyping, and front-end implementation.",
    sameAs: [
      "https://github.com/RHS059",
      "https://www.linkedin.com/in/reid59slaughter/",
      "https://x.com/reidhslaughter",
    ],
    knowsAbout: ["Product Design", "UX Design", "Design Engineering", "AI-assisted development", "Claude Code", "ChatGPT", "Figma", "Prototyping", "Front-end development"],
  },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#181425] px-6 py-16">
      <StructuredData data={person} />
      <article className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm underline underline-offset-4">← Portfolio</Link>
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.18em] text-[#685c84]">About</p>
          <h1 className="text-5xl font-semibold tracking-tight">Reid Slaughter</h1>
          <p className="text-xl text-[#3b2d56]">Product Designer & Design Engineer</p>
        </header>
        <div className="space-y-5 text-lg leading-relaxed">
          <p>I design and build front-end interfaces people use to do their jobs. My professional UX work spans enterprise fleet and asset management, public safety, construction and utilities, and library systems serving hundreds of millions of bibliographic records.</p>
          <p>I also use AI coding agents such as Claude Code and ChatGPT to move directly from product design into functional prototypes and production-ready interfaces. My recent work includes AI-assisted development, game-development tools, automation utilities, and experimental product interfaces.</p>
          <p>My work sits between product design, UX architecture, design engineering, prototyping, and implementation. I am most useful on problems where understanding the system matters as much as designing the screen.</p>
        </div>
        <nav className="flex flex-wrap gap-5 pt-4" aria-label="Profiles">
          <a href="https://github.com/RHS059" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">GitHub</a>
          <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">LinkedIn</a>
          <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">X</a>
          <Link href="/writing" className="underline underline-offset-4">Writing</Link>
        </nav>
      </article>
    </main>
  )
}
