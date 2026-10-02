type TwitterWidgets = {
  ready: (callback: () => void) => void
  widgets: {
    createTweet: (id: string, element: HTMLElement, options: {
      dnt: boolean; theme: string; conversation: string; align: string
    }) => Promise<HTMLElement | undefined>
  }
}

declare global {
  interface Window { twttr?: TwitterWidgets }
}

let loading: Promise<TwitterWidgets> | undefined

// One shared readiness promise covers simultaneous embeds and route remounts,
// including mounts that occur while the official script is still downloading.
export function loadTwitterWidgets(): Promise<TwitterWidgets> {
  if (loading) return loading
  loading = new Promise<TwitterWidgets>((resolve, reject) => {
    const script = document.createElement("script")
    const timeout = setTimeout(() => fail(), 20_000)
    const fail = () => {
      clearTimeout(timeout)
      script.remove()
      reject(new Error("X widgets could not be loaded."))
    }
    const ready = () => {
      const twitter = window.twttr
      if (!twitter?.widgets) return fail()
      twitter.ready(() => {
        clearTimeout(timeout)
        resolve(twitter)
      })
    }
    if (window.twttr?.widgets) {
      ready()
      return
    }
    script.id = "article-x-widgets"
    script.src = "https://platform.twitter.com/widgets.js"
    script.async = true
    script.onload = ready
    script.onerror = fail
    document.head.appendChild(script)
  }).catch((error) => {
    loading = undefined
    throw error
  })
  return loading
}
