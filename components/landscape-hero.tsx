"use client"

import Image from "next/image"
import { useEffect, useRef, useSyncExternalStore } from "react"
import type { LandscapeAnimation } from "@/lib/landscape-scene"
import styles from "@/app/writing/writing.module.css"

type Hero = { src: string; alt: string; position: string; parallax?: LandscapeAnimation }
const preference = "(prefers-reduced-motion: reduce)"
const readPreference = () => window.matchMedia(preference).matches
const serverPreference = () => true
function subscribe(onChange: () => void) {
  const query = window.matchMedia(preference)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export default function LandscapeHero({ image }: { image: Hero }) {
  const host = useRef<HTMLDivElement>(null)
  const reducedMotion = useSyncExternalStore(subscribe, readPreference, serverPreference)
  const animation = image.parallax

  useEffect(() => {
    const element = host.current
    if (!element || !animation || reducedMotion) return
    const abort = new AbortController()
    let controller: ReturnType<typeof import("@/lib/landscape-scene").createLandscapeScene> | undefined
    let loading = false
    let visible = false
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      controller?.setVisible(visible)
      if (!visible || loading) return
      loading = true
      import("@/lib/landscape-scene").then(({ createLandscapeScene }) => {
        if (abort.signal.aborted) return
        controller = createLandscapeScene(element, animation, image.position, image.src)
        controller.setVisible(visible)
      }).catch(() => { element.dataset.scene = "fallback" })
    })
    observer.observe(element)
    return () => {
      abort.abort()
      observer.disconnect()
      controller?.dispose()
      element.dataset.scene = "fallback"
    }
  }, [animation, image.position, image.src, reducedMotion])

  return (
    <div ref={host} className={styles.hero} data-scene="fallback">
      <Image src={image.src} alt={image.alt} width={1920} height={1080} sizes="(max-width: 900px) 100vw, 75vw" loading="eager" className={styles.heroImage} style={{ objectPosition: image.position }} />
    </div>
  )
}
