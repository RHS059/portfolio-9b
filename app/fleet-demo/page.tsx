import type { Metadata } from "next"
import FleetDemoShell from "@/components/fleet-demo-shell"

export const metadata: Metadata = {
  title: "Fleet maintenance case study | Reid Slaughter",
  description: "Why the same trucks kept returning for maintenance: inspect conflicting odometer readings and choose the source for each vehicle.",
}

export default function FleetDemoPage() {
  return <FleetDemoShell />
}
