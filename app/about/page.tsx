import type { Metadata } from "next"
import StructuredData from "../../components/structured-data"
import PortfolioShell from "@/components/portfolio-shell"
import LandscapeHero from "@/components/landscape-hero"
import heroImages from "@/content/article-heroes.json"
import styles from "@/app/writing/writing.module.css"

const description = "Reid Slaughter designs and builds enterprise UX and AI tools, and helps train and evaluate AI models through micro1 and Mercor."

export const metadata: Metadata = {
  title: "About Reid Slaughter | Product Designer & Design Engineer",
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Reid Slaughter | Product Designer & Design Engineer",
    description,
    url: "https://www.reidhslaughter.com/about",
    type: "profile",
    images: ["/og-hero.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Reid Slaughter | Product Designer & Design Engineer",
    description,
    images: ["/og-hero.jpg"],
  },
}

const person = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": "Person",
    "@id": "https://www.reidhslaughter.com/#reid-slaughter",
    name: "Reid Slaughter",
    url: "https://www.reidhslaughter.com/about",
    image: "https://www.reidhslaughter.com/reid-slaughter-purple.webp",
    jobTitle: "Product Designer & Design Engineer",
    description,
    sameAs: [
      "https://github.com/RHS059",
      "https://www.linkedin.com/in/reid59slaughter/",
      "https://x.com/reidhslaughter",
    ],
    knowsAbout: ["Product Design", "UX Design", "Design Engineering", "AI-assisted development", "AI model training", "AI evaluation", "Blender", "Claude Code", "ChatGPT", "Figma", "Prototyping", "Front-end development"],
  },
}

export default function AboutPage() {
  const hero = heroImages.images.find((image) => image.id === "beach-boardwalk")
  if (!hero) throw new Error("The About page hero is missing from the image pool.")
  return (
    <PortfolioShell reading alignTop>
      <StructuredData data={person} />
      <article>
        <header className={styles.content}>
          <h1 className={styles.heading}>About Me</h1>
          <p className={styles.meta}>Product Designer &amp; Design Engineer</p>
        </header>
        <LandscapeHero image={hero} />
        <div className={`${styles.content} space-y-8`}>
          <div className={styles.body}>
            <p>I design and build the front-end interfaces people use to do their jobs. Most of that work has been fleet and asset management for construction, utilities, and law enforcement. Later it was library systems spanning 540 million bibliographic records.</p>
            <p>
              For example, at <a href="https://www.collectivedata.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Collective Data</a>, fuel transaction imports failed quietly. Bad records sat undetected for months, customers paid for the cleanup, and engineers burned weeks on the same support tickets. I interviewed support agents, account managers, and the vendors we pulled data from, then designed a framework that catches bad records on arrival and emails the customer the same day. I rebuilt the integration and the API calls. Onboarding time also dropped because we could get integrations working for customers far faster. Resolving a data issue went from weeks to hours.
            </p>
            <p>I also use AI coding agents such as Claude Code and ChatGPT to move directly from product design into functional prototypes and production-ready interfaces. My recent work includes AI-assisted development, game-development tools, automation utilities, and experimental product interfaces.</p>
            <p>Through micro1 and Mercor, I help train and evaluate models for top AI labs, drawing on my product design and Blender experience.</p>
            <p>My work sits between product design, UX architecture, design engineering, prototyping, and implementation. I am most useful on problems where understanding the system matters as much as designing the screen.</p>
          </div>
          <nav className="flex flex-wrap gap-5 pt-4" aria-label="Profiles">
            <a href="https://github.com/RHS059" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">GitHub</a>
            <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">LinkedIn</a>
            <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">X</a>
          </nav>
        </div>
      </article>
    </PortfolioShell>
  )
}
