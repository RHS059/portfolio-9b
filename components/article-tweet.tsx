"use client"

import { useEffect, useRef, useState } from "react"
import type { TweetReference } from "@/lib/article-schema"
import { loadTwitterWidgets } from "@/lib/twitter-widgets"
import { getConsent, onConsentChange } from "@/lib/consent"
import styles from "./article-tweet.module.css"

export default function ArticleTweet({ tweet }: { tweet: TweetReference }) {
  const container = useRef<HTMLDivElement>(null)
  const [accepted, setAccepted] = useState(false)

  // X's widget script sets tracking cookies, so it only loads after consent.
  // Until then the server-rendered link below is the whole embed.
  useEffect(() => {
    setAccepted(getConsent() === "accepted")
    return onConsentChange((value) => setAccepted(value === "accepted"))
  }, [])

  useEffect(() => {
    if (!accepted || !container.current) return
    // Each mount gets its own target so an old async render cannot duplicate or
    // overwrite a new embed after client navigation or a Strict Mode remount.
    const target = document.createElement("div")
    container.current.appendChild(target)
    let cancelled = false
    void (async () => {
      try {
        const twitter = await loadTwitterWidgets()
        if (cancelled) return
        await twitter.widgets.createTweet(tweet.id, target, {
          dnt: true,
          theme: "light",
          conversation: "none",
          align: "center",
        })
      } catch {
        // A blocked script/frame, unavailable post, or network failure should
        // never remove the server-rendered, keyboard-accessible source link.
        target.replaceChildren()
      }
    })()
    return () => {
      cancelled = true
      target.remove()
    }
  }, [accepted, tweet.id])

  return (
    <figure className={styles.tweet} aria-label={`Post by @${tweet.handle} on X`}>
      <div ref={container} className={styles.widget} />
      <figcaption className={styles.caption}>
        <a href={tweet.url} target="_blank" rel="noopener noreferrer">View post by @{tweet.handle} on X <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>
      </figcaption>
    </figure>
  )
}
