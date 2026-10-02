import assert from "node:assert/strict"
import test from "node:test"
import { loadTwitterWidgets } from "../lib/twitter-widgets.ts"

test("shared widget loader retries failures and resolves all in-flight/remounted consumers", async () => {
  const scripts = []
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  globalThis.window = {}
  globalThis.document = {
    createElement: () => ({ remove() { this.removed = true } }),
    head: { appendChild(script) { scripts.push(script) } },
  }
  try {
    const failed = loadTwitterWidgets()
    const rejection = assert.rejects(failed, /could not be loaded/)
    scripts[0].onerror()
    await rejection
    assert.equal(scripts[0].removed, true)

    const first = loadTwitterWidgets()
    const second = loadTwitterWidgets()
    const third = loadTwitterWidgets()
    // Also models a new consumer after another component unmounts mid-load.
    const remounted = loadTwitterWidgets()
    assert.equal(first, second)
    assert.equal(first, third)
    assert.equal(first, remounted)
    assert.equal(scripts.length, 2, "one retry script shared by every consumer")
    assert.equal(scripts[1].src, "https://platform.twitter.com/widgets.js")
    assert.equal(scripts[1].async, true)

    let onReady
    const api = { widgets: { createTweet() {} }, ready(callback) { onReady = callback } }
    globalThis.window.twttr = api
    scripts[1].onload()
    let resolved = false
    first.then(() => { resolved = true })
    await Promise.resolve()
    assert.equal(resolved, false, "script load alone is not widget readiness")
    onReady()
    assert.deepEqual(await Promise.all([first, second, third, remounted]), [api, api, api, api])
    assert.equal(await loadTwitterWidgets(), api)
    assert.equal(scripts.length, 2, "loaded script is reused on later navigation")
  } finally {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
  }
})
