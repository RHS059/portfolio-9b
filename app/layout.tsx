import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { Figtree } from "next/font/google"
import { Instrument_Serif } from "next/font/google"
import { Inter } from "next/font/google"
import "./globals.css"

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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.reidhslaughter.com"),
  title: "Reid Slaughter — Design Engineer",
  description: "Explore Reid Slaughter’s portfolio of design engineering and user experience projects.",
  generator: "v0.app",
  openGraph: {
    title: "Reid Slaughter — Design Engineer",
    description: "Explore Reid Slaughter’s portfolio of design engineering and user experience projects.",
    url: "https://www.reidhslaughter.com/",
    type: "website",
    images: [
      {
        url: "https://www.reidhslaughter.com/og-hero.gif",
        width: 1200,
        height: 630,
        type: "image/gif",
        alt: "Fleet management dashboard over a colorful landscape",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reid Slaughter — Design Engineer",
    description: "Explore Reid Slaughter’s portfolio of design engineering and user experience projects.",
    images: ["https://www.reidhslaughter.com/og-hero-static.png"],
  },
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
