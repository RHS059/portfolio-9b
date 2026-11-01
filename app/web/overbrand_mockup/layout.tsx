import type { Metadata, Viewport } from "next"
import { League_Spartan } from "next/font/google"

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-league-spartan",
  display: "swap",
})

const title = "Overbrand.ai Landing Page Concept | Reid Slaughter"
const description =
  "A landing page concept for overbrand.ai, a fictional AI service that turns a company website into brochures, booth graphics and business cards."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/web/overbrand_mockup" },
  openGraph: {
    title,
    description,
    url: "https://www.reidhslaughter.com/web/overbrand_mockup",
    type: "website",
    images: [{ url: "/overbrand-mockup/booth.webp", alt: "Northwind trade show booth mockup" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={leagueSpartan.variable}>{children}</div>
}
