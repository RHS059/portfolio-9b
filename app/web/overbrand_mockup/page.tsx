"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check, Globe, Instagram, Linkedin, Loader2, Pause, Play, Sparkles, Twitter, Wand2 } from "lucide-react"
import styles from "./overbrand.module.css"

const SLIDES = [
  {
    src: "/overbrand-mockup/booth.webp",
    label: "Booth graphics",
    alt: "Northwind trade show booth with a cobalt blue backdrop and matching counter",
  },
  {
    src: "/overbrand-mockup/brochure.webp",
    label: "Tri-fold brochure",
    alt: "Open Northwind tri-fold brochure laid flat on a grey surface",
  },
  {
    src: "/overbrand-mockup/cards.webp",
    label: "Business cards",
    alt: "Northwind business cards, fronts and backs, laid flat on a grey surface",
  },
]

const STEPS = [
  {
    icon: Globe,
    title: "Paste your URL",
    body: "Our AI reads your website and pulls your logo, colors, typefaces, headlines and product imagery into a brand kit.",
  },
  {
    icon: Wand2,
    title: "AI lays out every piece",
    body: "It designs brochures, booth graphics, business cards and email signatures that follow your brand, sized for print or screen.",
  },
  {
    icon: Sparkles,
    title: "Refine and download",
    body: "Ask for changes in plain language, like “shorter headline” or “use the team photo,” then download print-ready files.",
  },
]

type FormState = "idle" | "loading" | "done" | "error"

function Logo() {
  return (
    <a href="#top" className={styles.logo}>
      <svg className={styles.logoMark} width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
          <line x1="18" y1="4" x2="18" y2="32" />
          <line x1="5.9" y1="11" x2="30.1" y2="25" />
          <line x1="5.9" y1="25" x2="30.1" y2="11" />
        </g>
      </svg>
      <span className={styles.display}>
        overbrand<span className={styles.logoTld}>.ai</span>
      </span>
    </a>
  )
}

export default function OverbrandMockup() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (reduceMotion) setPaused(true)
  }, [reduceMotion])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = window.setTimeout(() => setActive((i) => (i + 1) % SLIDES.length), 6000)
    return () => window.clearTimeout(id)
  }, [active, paused])

  const focusForm = (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById("top")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })
    inputRef.current?.focus({ preventScroll: true })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormState("error")
      inputRef.current?.focus()
      return
    }
    setFormState("loading")
    window.setTimeout(() => setFormState("done"), 1200)
  }

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <div className={styles.headerInner}>
          <Logo />
          <nav aria-label="Primary" className={styles.nav}>
            <a href="#top" className={styles.navLink}>Examples</a>
            <a href="#how-it-works" className={styles.navLink}>How it works</a>
            <a href="#top" className={styles.navLink}>Free email signature</a>
          </nav>
          <a href="#top" onClick={focusForm} className={`${styles.cta} ${styles.ctaSmall}`}>
            Get my free preview
            <ArrowRight className={styles.ctaArrow} size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="main">
        <section id="top" className={styles.hero} aria-label="Introduction">
          <div className={styles.slides}>
            {SLIDES.map((s, i) => (
              <div
                key={s.src}
                className={`${styles.slide} ${i === active ? styles.slideActive : ""}`}
                aria-hidden={i !== active}
              >
                <Image src={s.src} alt={s.alt} fill sizes="100vw" priority={i === 0} className={styles.slideImg} />
              </div>
            ))}
            <div className={styles.scrim} />
          </div>

          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <motion.h1 className={`${styles.display} ${styles.h1}`} {...rise(0)}>
                Your website.
                <span className={styles.h1Accent}>We’ll build the rest.</span>
              </motion.h1>
              <motion.p className={styles.lede} {...rise(0.12)}>
                Turn your website into brochures, booth graphics, business cards and animated email signatures, all
                with your company’s look and feel.
              </motion.p>

              <motion.form className={styles.form} onSubmit={onSubmit} noValidate {...rise(0.24)}>
                <label htmlFor="work-email" className={styles.srOnly}>
                  Work email
                </label>
                <input
                  ref={inputRef}
                  id="work-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="you@company.com…"
                  value={email}
                  aria-invalid={formState === "error"}
                  aria-describedby="form-status"
                  disabled={formState === "loading" || formState === "done"}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (formState === "error") setFormState("idle")
                  }}
                  className={styles.input}
                />
                <button
                  type="submit"
                  className={`${styles.cta} ${styles.ctaLarge} ${formState === "done" ? styles.ctaDone : ""}`}
                  disabled={formState === "loading" || formState === "done"}
                >
                  {formState === "loading" && (
                    <>
                      <Loader2 size={20} className={styles.spin} aria-hidden="true" />
                      Building preview…
                    </>
                  )}
                  {formState === "done" && (
                    <>
                      <Check size={20} aria-hidden="true" />
                      Preview requested
                    </>
                  )}
                  {(formState === "idle" || formState === "error") && (
                    <>
                      Get my free preview
                      <ArrowRight size={20} className={styles.ctaArrow} aria-hidden="true" />
                    </>
                  )}
                </button>
              </motion.form>
              <p id="form-status" className={styles.status} aria-live="polite">
                {formState === "error" && <span className={styles.error}>Enter a work email like you@company.com.</span>}
                {formState === "done" && (
                  <>In the real product, your preview would land in {email.trim()}. This is a concept demo.</>
                )}
              </p>
            </div>
          </div>

          <div className={styles.controls}>
            <div className={styles.tabs} role="group" aria-label="Example mockups">
              {SLIDES.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                >
                  <span className={styles.tabLabel}>{s.label}</span>
                </button>
              ))}
              <button
                type="button"
                className={styles.pause}
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              >
                {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
              </button>
            </div>
            <p className={styles.caption}>Northwind is a fictional sample brand</p>
          </div>
        </section>

        <section id="how-it-works" className={styles.how} aria-labelledby="how-title">
          <div className={styles.container}>
            <h2 id="how-title" className={`${styles.display} ${styles.h2}`}>
              How it works
            </h2>
            <p className={styles.howIntro}>
              Three steps from homepage to print-ready brand kit. The AI does the layout work; you stay in control of
              every word.
            </p>
            <ol className={styles.cards}>
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.li
                    key={step.title}
                    className={styles.card}
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className={styles.step}>Step {i + 1}</span>
                    <span className={styles.icon}>
                      <Icon size={24} aria-hidden="true" />
                    </span>
                    <h3 className={`${styles.display} ${styles.h3}`}>{step.title}</h3>
                    <p className={styles.cardBody}>{step.body}</p>
                  </motion.li>
                )
              })}
            </ol>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <div>
            <Logo />
            <ul className={styles.social} aria-label="Social media">
              <li>
                <a href="#" aria-label="overbrand.ai on LinkedIn" className={styles.socialLink}>
                  <Linkedin size={20} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href="#" aria-label="overbrand.ai on X" className={styles.socialLink}>
                  <Twitter size={20} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href="#" aria-label="overbrand.ai on Instagram" className={styles.socialLink}>
                  <Instagram size={20} aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
          <nav aria-label="Footer">
            <ul className={styles.footerLinks}>
              <li><a href="#" className={styles.footerLink}>Log in</a></li>
              <li><a href="#how-it-works" className={styles.footerLink}>How it works</a></li>
              <li><a href="#" className={styles.footerLink}>Privacy policy</a></li>
              <li><a href="#" className={styles.footerLink}>Cookie settings</a></li>
            </ul>
          </nav>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <p>© 2026 overbrand.ai</p>
          <p>
            Concept by <a href="/" className={styles.footerLink}>Reid Slaughter</a>. overbrand.ai and Northwind are
            fictional.
          </p>
        </div>
      </footer>
    </div>
  )
}
