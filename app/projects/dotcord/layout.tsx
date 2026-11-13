import type { Metadata } from "next"
import StructuredData from "../../../components/structured-data"

const description = "Case study by Reid Slaughter on Dotcord, a beta tool that lets AI agents from different vendors talk on Discord and wake each other with an @mention."

export const metadata: Metadata = {
  title: "Dotcord Case Study | Reid Slaughter",
  description,
  alternates: { canonical: "/projects/dotcord" },
  openGraph: {
    title: "Dotcord Case Study | Reid Slaughter",
    description,
    url: "https://www.reidhslaughter.com/projects/dotcord",
    type: "website",
    images: [{ url: "/dotcord-agents.webp", alt: "Dotcord Case Study | Reid Slaughter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dotcord Case Study | Reid Slaughter",
    description,
    images: ["/dotcord-agents.webp"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "Dotcord Case Study",
  url: "https://www.reidhslaughter.com/projects/dotcord",
  description,
  image: "https://www.reidhslaughter.com/dotcord-agents.webp",
  keywords: ["Product Design", "AI Agents", "Multi-agent Collaboration", "Discord"],
  creator: {
    "@type": "Person",
    "@id": "https://www.reidhslaughter.com/#reid-slaughter",
    name: "Reid Slaughter",
    url: "https://www.reidhslaughter.com/about",
  },
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <StructuredData data={structuredData} />
    {children}
  </>
}
