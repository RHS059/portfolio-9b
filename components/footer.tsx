import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#181425] text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-left">
          <h2 className="text-2xl font-bold mb-2">Reid Slaughter</h2>
          <p className="text-gray-300 mb-8 text-lg">UX designer turning user insights into measurable business outcomes</p>

          <div className="space-y-2 mb-8">
            <p className="text-gray-300">
              <a href="mailto:reids@reidhslaughter.com" className="hover:text-white transition-colors">
                reids@reidhslaughter.com
              </a>
            </p>
          </div>

          <div className="mb-8">
            <Button asChild size="lg" className="bg-[#685c84] hover:bg-[#3b2d56] text-white">
              <Link href="https://www.linkedin.com/in/reid59slaughter/" target="_blank">
                Connect with me on LinkedIn
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
