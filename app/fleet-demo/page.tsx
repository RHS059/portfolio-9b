import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fleet maintenance case study | Reid Slaughter",
  description: "Why the same trucks kept returning for maintenance: inspect conflicting odometer readings and choose the source for each vehicle.",
}

export default function FleetDemoPage() {
  return (
    <main className="min-h-screen w-full bg-[#eeede7]">
      <h1 className="sr-only">Fleet maintenance interactive case study</h1>
      <iframe
        title="Fleet maintenance working demo"
        src="/fleet-demo/index.html"
        className="h-screen w-full border-0"
        allow="fullscreen"
      />
    </main>
  )
}
