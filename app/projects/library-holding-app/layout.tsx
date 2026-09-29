import type { Metadata } from "next"
import StructuredData from "../../../components/structured-data"

export const metadata: Metadata = {
  title: "WorldCat Find Mobile UX Case Study | Reid Slaughter",
  description: "Reid Slaughter's UX case study for WorldCat Find, a native mobile library search experience designed for iOS and Android.",
  alternates: { canonical: "/projects/library-holding-app" },
  openGraph: {
    title: "WorldCat Find Mobile UX Case Study | Reid Slaughter",
    description: "Reid Slaughter's UX case study for WorldCat Find, a native mobile library search experience designed for iOS and Android.",
    url: "https://www.reidhslaughter.com/projects/library-holding-app",
    type: "website",
    images: [{ url: "/worldcat-hero.png", alt: "WorldCat Find Mobile UX Case Study | Reid Slaughter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WorldCat Find Mobile UX Case Study | Reid Slaughter",
    description: "Reid Slaughter's UX case study for WorldCat Find, a native mobile library search experience designed for iOS and Android.",
    images: ["/worldcat-hero.png"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "WorldCat Find Mobile UX Case Study",
  url: "https://www.reidhslaughter.com/projects/library-holding-app",
  description: "Reid Slaughter's UX case study for WorldCat Find, a native mobile library search experience designed for iOS and Android.",
  image: "https://www.reidhslaughter.com/worldcat-hero.png",
  keywords: ["UX Design","Product Design","Mobile Design","User Research","Figma"],
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
