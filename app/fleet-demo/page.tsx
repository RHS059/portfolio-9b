import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fleet source-of-truth demo | Reid Slaughter",
  description: "A working, synthetic replay of a partial telematics migration: inspect source records, apply per-vehicle authority, and compare original validation controls with an agent-assisted review approach.",
}

export default function FleetDemoPage() {
  return (
    <main className="min-h-screen w-full bg-[#eeede7]">
      <h1 className="sr-only">Fleet integration: source-of-truth interactive demo</h1>
      <iframe
        title="Fleet integration source-of-truth working demo"
        src="/fleet-demo/index.html"
        className="h-screen w-full border-0"
        allow="fullscreen"
      />
    </main>
  )
}
