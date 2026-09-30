import type { Metadata } from "next"
import PortfolioHome from "@/components/portfolio-home"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function Portfolio() {
  return <PortfolioHome />
}
