import AnimatedLink from "./animated-link"
import { BriefcaseBusiness, FileText, PenLine, UserRound } from "lucide-react"

export default function PortfolioLinks({ workHref = "/" }: { workHref?: string }) {
  return (
    <>
      <AnimatedLink href={workHref} className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={15} aria-hidden="true" />Work</AnimatedLink>
      <AnimatedLink href="/about" className="inline-flex items-center gap-1.5"><UserRound size={15} aria-hidden="true" />About</AnimatedLink>
      <AnimatedLink href="/writing" className="inline-flex items-center gap-1.5"><PenLine size={15} aria-hidden="true" />Writing</AnimatedLink>
      <a href="/Reid_Slaughter_Resume.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5" aria-label="Resume (PDF, opens in a new tab)"><FileText size={15} aria-hidden="true" />Resume <span className="text-xs opacity-70">PDF ↗</span></a>
    </>
  )
}
