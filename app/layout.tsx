import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { Figtree } from "next/font/google"
import { Instrument_Serif } from "next/font/google"
import { Inter } from "next/font/google"
import "./globals.css"
import StructuredData from "../components/structured-data"

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})

// Use the real JPEG for both crawlers. og-hero.gif contains JPEG bytes,
// so its extension and served Content-Type do not match the image.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.reidhslaughter.com"),
  title: "Reid Slaughter | Product Designer & Design Engineer",
  description: "Product designer and design engineer specializing in UX, AI-assisted product development, Claude Code, ChatGPT, prototyping, and front-end implementation.",
  generator: "v0.app",
  openGraph: {
    title: "Reid Slaughter | Product Designer & Design Engineer",
    description: "Product designer and design engineer specializing in UX, AI-assisted product development, Claude Code, ChatGPT, prototyping, and front-end implementation.",
    url: "https://www.reidhslaughter.com/",
    type: "website",
    images: [
      {
        url: "https://www.reidhslaughter.com/og-hero.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Fleet management dashboard over a colorful landscape",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reid Slaughter | Product Designer & Design Engineer",
    description: "Product designer and design engineer specializing in UX, AI-assisted product development, Claude Code, ChatGPT, prototyping, and front-end implementation.",
    images: [
      {
        url: "https://www.reidhslaughter.com/og-hero.jpg",
        alt: "Fleet management dashboard over a colorful landscape",
      },
    ],
  },
}

const personStructuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://www.reidhslaughter.com/#reid-slaughter",
  name: "Reid Slaughter",
  url: "https://www.reidhslaughter.com/about",
  image: "https://www.reidhslaughter.com/reid-slaughter-purple.webp",
  jobTitle: "Product Designer & Design Engineer",
  description: "Product designer and design engineer specializing in UX, AI-assisted product development, prototyping, and front-end implementation.",
  sameAs: [
    "https://github.com/RHS059",
    "https://www.linkedin.com/in/reid59slaughter/",
    "https://x.com/reidhslaughter",
  ],
  knowsAbout: [
    "Product Design",
    "UX Design",
    "Design Engineering",
    "AI-assisted development",
    "Claude Code",
    "ChatGPT",
    "Figma",
    "Prototyping",
    "Front-end development",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${instrumentSerif.variable} ${inter.variable}`}>
      <head>
        <link
          rel="preload"
          as="image"
          href="/reid-slaughter-purple.webp"
          type="image/webp"
          media="(min-width: 1024px)"
          fetchPriority="high"
        />
      </head>
      <body>
        <StructuredData data={personStructuredData} />
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "kg4cvt3xg0");
          `}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
