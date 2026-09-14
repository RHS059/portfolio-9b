"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"

export default function Navigation() {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    setMobileOpen(false)
    if (window.location.pathname !== "/") {
      router.push("/")
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
      return
    }

    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleHomeClick = () => {
    setMobileOpen(false)
    if (window.location.pathname !== "/") {
      router.push("/")
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#181425]/95 backdrop-blur-sm border-b border-gray-700 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile-only bar: name as home button (left) + hamburger (right) */}
        <div className="flex md:hidden justify-between items-center h-16">
          <button
            onClick={handleHomeClick}
            className="text-white hover:text-[#9b95b2] active:text-[#7d76a0] px-2 py-2 text-base font-semibold tracking-tight transition-colors rounded-md hover:bg-white/5"
          >
            Reid Slaughter
          </button>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="text-white hover:text-[#9b95b2] p-2 rounded-md hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Desktop nav (centered) */}
        <div className="hidden md:flex justify-center items-center h-16">
          <div className="flex space-x-8">
            <button
              onClick={handleHomeClick}
              className="text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("projects")}
              className="text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors"
            >
              Projects
            </button>
            <Link
              href="https://docs.google.com/document/d/1qIT5B1hxDhxFk0-Uxi8QSRbmxQoxVQWR8SH00PHZOk8/edit?usp=sharing"
              target="_blank"
              className="text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors"
            >
              View Resume
            </Link>
            <Link
              href="https://www.linkedin.com/in/reid59slaughter/"
              target="_blank"
              className="text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors"
            >
              LinkedIn
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-700 bg-[#181425]/95 backdrop-blur-sm">
          <div className="flex flex-col items-end px-4 py-2 space-y-1">
            <button
              onClick={() => scrollToSection("projects")}
              className="w-full text-right text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-white/5"
            >
              Projects
            </button>
            <Link
              href="https://docs.google.com/document/d/1qIT5B1hxDhxFk0-Uxi8QSRbmxQoxVQWR8SH00PHZOk8/edit?usp=sharing"
              target="_blank"
              onClick={() => setMobileOpen(false)}
              className="w-full text-right text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-white/5"
            >
              View Resume
            </Link>
            <Link
              href="https://www.linkedin.com/in/reid59slaughter/"
              target="_blank"
              onClick={() => setMobileOpen(false)}
              className="w-full text-right text-white hover:text-[#9b95b2] px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-white/5"
            >
              LinkedIn
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
