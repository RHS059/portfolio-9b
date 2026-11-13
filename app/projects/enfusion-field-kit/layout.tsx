import type { Metadata } from "next"
import StructuredData from "../../../components/structured-data"

const description = "Case study by Reid Slaughter on Enfusion Field Kit, a browser tool that prepares 3D models and textures for Arma Reforger, cutting a 45-minute texture job to about 90 seconds."

export const metadata: Metadata = {
  title: "Enfusion Field Kit Case Study | Reid Slaughter",
  description,
  alternates: { canonical: "/projects/enfusion-field-kit" },
  openGraph: {
    title: "Enfusion Field Kit Case Study | Reid Slaughter",
    description,
    url: "https://www.reidhslaughter.com/projects/enfusion-field-kit",
    type: "website",
    images: [{ url: "/enfusion-field-kit.webp", alt: "Enfusion Field Kit Case Study | Reid Slaughter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Enfusion Field Kit Case Study | Reid Slaughter",
    description,
    images: ["/enfusion-field-kit.webp"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "Enfusion Field Kit Case Study",
  url: "https://www.reidhslaughter.com/projects/enfusion-field-kit",
  description,
  image: "https://www.reidhslaughter.com/enfusion-field-kit.webp",
  keywords: ["Product Design","Design Engineering","Game Development Tools","Arma Reforger"],
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
