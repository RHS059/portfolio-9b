import type { Metadata } from "next"
import StructuredData from "../../../components/structured-data"

export const metadata: Metadata = {
  title: "Fleet Fuel Integration UX Case Study | Reid Slaughter",
  description: "UX case study by Reid Slaughter on redesigning a fleet fuel integration framework to detect bad data earlier and reduce resolution time from weeks to hours.",
  alternates: { canonical: "/projects/fleet-fuel-integration" },
  openGraph: {
    title: "Fleet Fuel Integration UX Case Study | Reid Slaughter",
    description: "UX case study by Reid Slaughter on redesigning a fleet fuel integration framework to detect bad data earlier and reduce resolution time from weeks to hours.",
    url: "https://www.reidhslaughter.com/projects/fleet-fuel-integration",
    type: "website",
    images: [{ url: "/fleet-dashboard.png", alt: "Fleet Fuel Integration UX Case Study | Reid Slaughter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fleet Fuel Integration UX Case Study | Reid Slaughter",
    description: "UX case study by Reid Slaughter on redesigning a fleet fuel integration framework to detect bad data earlier and reduce resolution time from weeks to hours.",
    images: ["/fleet-dashboard.png"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "Fleet Fuel Integration UX Case Study",
  url: "https://www.reidhslaughter.com/projects/fleet-fuel-integration",
  description: "UX case study by Reid Slaughter on redesigning a fleet fuel integration framework to detect bad data earlier and reduce resolution time from weeks to hours.",
  image: "https://www.reidhslaughter.com/fleet-dashboard.png",
  keywords: ["UX Design","Enterprise UX","Fleet Management","Systems Design","API Integration"],
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
