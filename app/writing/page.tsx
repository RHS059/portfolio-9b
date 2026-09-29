import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Writing | Reid Slaughter",
  description: "Writing by Reid Slaughter about product design, UX, design engineering, AI coding agents, Claude Code, ChatGPT, and building software.",
  alternates: { canonical: "/writing" },
}

export default function WritingPage() {
  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#181425] px-6 py-16">
      <section className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm underline underline-offset-4">← Portfolio</Link>
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.18em] text-[#685c84]">Writing</p>
          <h1 className="text-5xl font-semibold tracking-tight">Design, AI, and building software</h1>
          <p className="text-lg leading-relaxed text-[#3b2d56]">Notes and case-driven writing about product design, UX, design engineering, Claude Code, ChatGPT, AI-assisted development, and moving from design decisions to working software.</p>
        </header>
        <p className="text-base text-[#685c84]">Articles are coming soon.</p>
      </section>
    </main>
  )
}
