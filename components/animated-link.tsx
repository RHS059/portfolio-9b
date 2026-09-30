"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

const MotionLink = motion.create(Link)
const spring = { type: "spring", stiffness: 520, damping: 30 } as const
const motionPreference = "(prefers-reduced-motion: reduce)"
const readMotionPreference = () => window.matchMedia(motionPreference).matches
const serverMotionPreference = () => true
function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(motionPreference)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export default function AnimatedLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, readMotionPreference, serverMotionPreference)
  const interaction = {
    className,
    initial: false as const,
    whileHover: reducedMotion ? undefined : { y: -1 },
    whileTap: reducedMotion ? undefined : { scale: 0.965, y: 1 },
    transition: spring,
  }
  return href.startsWith("/") || href.startsWith("#") ? (
    <MotionLink href={href} {...interaction}>{children}</MotionLink>
  ) : (
    <motion.a href={href} {...interaction}>{children}</motion.a>
  )
}
