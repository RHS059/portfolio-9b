import PortfolioShell from "@/components/portfolio-shell"

export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioShell reading>{children}</PortfolioShell>
  )
}
