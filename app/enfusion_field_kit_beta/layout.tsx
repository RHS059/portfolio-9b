import type { Metadata } from "next"
import StructuredData from "../../components/structured-data"

export const metadata: Metadata = {
  title: "Enfusion Field Kit | Reid Slaughter",
  description: "Interactive Enfusion Field Kit project by product designer and design engineer Reid Slaughter.",
  alternates: { canonical: "/enfusion_field_kit_beta" },
  openGraph: {
    title: "Enfusion Field Kit | Reid Slaughter",
    description: "Interactive Enfusion Field Kit project by product designer and design engineer Reid Slaughter.",
    url: "https://www.reidhslaughter.com/enfusion_field_kit_beta",
    type: "website",
    images: [{ url: "/enfusion-field-kit.webp", alt: "Enfusion Field Kit | Reid Slaughter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Enfusion Field Kit | Reid Slaughter",
    description: "Interactive Enfusion Field Kit project by product designer and design engineer Reid Slaughter.",
    images: ["/enfusion-field-kit.webp"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Enfusion Field Kit",
  url: "https://www.reidhslaughter.com/enfusion_field_kit_beta",
  description: "Interactive Enfusion Field Kit project by product designer and design engineer Reid Slaughter.",
  image: "https://www.reidhslaughter.com/enfusion-field-kit.webp",
  keywords: ["Product Design","Design Engineering","Game Development Tools","Front-end Development"],
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
