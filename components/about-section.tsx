"use client"

import { useState } from "react"
import Link from "next/link"

export default function ProjectsSection() {
  const [hoveredProject, setHoveredProject] = useState<number | null>(null)

  const projects = [
    {
      title: "Arma Reforger Texture Wizard",
      company: "Vibe Coded Design",
      description:
        "Automating texture conversion for game modders, eliminating hours of manual Photoshop work.",
      results:
        "• 14 texture sets: ~45 min in Photoshop to ~1 min\n• Automated channel packing and format conversion\n• One-click zip export of all textures\n• Browser-based, no software installation required",
      link: "/projects/arma-reforger-texture-wizard",
      backgroundImage: "/arma-texture-wizard.png",
    },
    {
      title: "Streamlining Fuel Management for Large Fleets",
      company: "Collective Data",
      description:
        "Redesigned fuel transaction import framework to address infrastructural issues and reduce engineering overhead.",
      results:
        "• Improved time to resolve data issues by 90% (weeks to hours)\n• Immediate notification of data issues via email\n• Data issues (when they occur), are detected immediately\n• Users avoid costly data cleanup",
      link: "/projects/fleet-fuel-integration",
      backgroundImage: "https://raw.githubusercontent.com/RHS059/portfolio-9b/v0/fleet-preview-thumbnails/public/fleet-overview.webp",
    },
  ]

  return (
    <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-bold text-[#181425] mb-10 text-left">Projects</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.map((project, index) => {
            const ProjectCard = (
              <div
                key={index}
                className="group relative bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredProject(index)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                <div className="relative aspect-video bg-gray-200 overflow-hidden">
                  <img
                    src={project.backgroundImage || "/placeholder.svg"}
                    alt={project.title}
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                  />

                  <div
                    className={`absolute inset-0 bg-[#181425]/90 flex items-center justify-center p-6 transition-opacity duration-300 hidden lg:flex ${
                      hoveredProject === index ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="text-left text-white w-full">
                      <h4 className="text-lg font-bold mb-4">Results</h4>
                      <div className="bg-[#9b95b2]/20 rounded-lg p-4">
                        <div className="text-sm leading-relaxed whitespace-pre-line text-white">{project.results}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#181425] mb-2 leading-tight">{project.title}</h3>
                  <p className="text-gray-600 font-medium mb-2">{project.company}</p>
                  <p className="text-[#181425] text-sm leading-relaxed">{project.description}</p>

                  <div className="mt-4 lg:hidden">
                    <h4 className="font-bold text-[#181425] mb-2">Results:</h4>
                    <div className="bg-[#9b95b2]/20 rounded-lg p-4">
                      <div className="text-sm text-[#181425] leading-relaxed whitespace-pre-line">
                        {project.results}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )

            return project.link ? (
              <Link key={index} href={project.link}>
                {ProjectCard}
              </Link>
            ) : (
              ProjectCard
            )
          })}
        </div>
      </div>
    </section>
  )
}
