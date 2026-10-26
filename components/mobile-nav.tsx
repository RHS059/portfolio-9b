"use client"

import { useEffect, useRef, useState } from "react"
import { Cookie, Github, Linkedin, Mail, Menu, Shield, X } from "lucide-react"
import PortfolioLinks from "./portfolio-links"
import AnimatedLink from "./animated-link"
import { openCookieSettings } from "@/lib/consent"
import styles from "./portfolio-home.module.css"

export default function MobileNav({ name: Name, workHref }: { name: "h1" | "p"; workHref: string }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  return (
    <>
      <header className={styles["m-head"]}>
        <button
          ref={toggleRef}
          type="button"
          className={styles["m-toggle"]}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <Name className={styles["m-name"]}>Reid Slaughter</Name>
        <span aria-hidden="true" />
      </header>
      <div className={`${styles["m-scrim"]} ${open ? styles["m-open"] : ""}`} aria-hidden="true" onClick={() => setOpen(false)} />
      <nav
        ref={menuRef}
        id="mobile-menu"
        aria-label="Mobile navigation"
        className={`${styles["m-menu"]} ${open ? styles["m-open"] : ""}`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) setOpen(false)
        }}
      >
        <PortfolioLinks workHref={workHref} />
        <hr />
        <a href="https://github.com/RHS059" target="_blank" rel="noopener noreferrer"><Github size={15} aria-hidden="true" />GitHub</a>
        <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer"><Linkedin size={15} aria-hidden="true" />LinkedIn</a>
        <a href="/privacy"><Shield size={15} aria-hidden="true" />Privacy</a>
        <button type="button" onClick={openCookieSettings}><Cookie size={15} aria-hidden="true" />Cookie Settings</button>
        <hr />
        <AnimatedLink className={styles.cta} href="mailto:reids@reidhslaughter.com"><Mail size={15} aria-hidden="true" />Reach Out</AnimatedLink>
      </nav>
    </>
  )
}
