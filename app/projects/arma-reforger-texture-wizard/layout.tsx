import type { Metadata } from "next"
import StructuredData from "../../../components/structured-data"

export const metadata: Metadata = {
  title: "Arma Reforger Texture Wizard | Reid Slaughter",
  description: "Reid Slaughter designed and built a browser-based texture automation tool for Arma Reforger modders, reducing a roughly 45-minute manual workflow to about 90 seconds.",
  alternates: { canonical: "/projects/arma-reforger-texture-wizard" },
  openGraph: {
    title: "Arma Reforger Texture Wizard | Reid Slaughter",
    description: "Reid Slaughter designed and built a browser-based texture automation tool for Arma Reforger modders, reducing a roughly 45-minute manual workflow to about 90 seconds.",
    url: "https://www.reidhslaughter.com/projects/arma-reforger-texture-wizard",
    type: "website",
    images: [{ url: "/arma-texture-wizard.png", alt: "Arma Reforger Texture Wizard | Reid Slaughter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arma Reforger Texture Wizard | Reid Slaughter",
    description: "Reid Slaughter designed and built a browser-based texture automation tool for Arma Reforger modders, reducing a roughly 45-minute manual workflow to about 90 seconds.",
    images: ["/arma-texture-wizard.png"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Arma Reforger Texture Wizard",
  url: "https://www.reidhslaughter.com/projects/arma-reforger-texture-wizard",
  description: "Reid Slaughter designed and built a browser-based texture automation tool for Arma Reforger modders, reducing a roughly 45-minute manual workflow to about 90 seconds.",
  image: "https://www.reidhslaughter.com/arma-texture-wizard.png",
  keywords: ["Product Design","Design Engineering","UX Design","Automation","Game Development Tools"],
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
