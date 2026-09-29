import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Teacher-Parent Communication UX Case Study | Reid Slaughter",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
