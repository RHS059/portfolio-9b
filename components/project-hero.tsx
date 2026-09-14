"use client"

import { useState } from "react"

interface ProjectHeroProps {
  company: string
  dateShipped: string
  title: string
  heroImage: {
    src: string
    alt: string
  }
  role: string
  timeline: string
  team: string
  skills: string
}

export default function ProjectHero({
  company,
  dateShipped,
  title,
  heroImage,
  role,
  timeline,
  team,
  skills,
}: ProjectHeroProps) {
  const [isHovered, setIsHovered] = useState(false)

  const isFleetProject = heroImage.src === "/fleet-dashboard.png"

  const handleClick = () => {
    if (isFleetProject) {
      window.open("https://preview--fleet-ai-pilot.lovable.app/", "_blank")
    }
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Meta Line */}
      <p className="text-xs uppercase tracking-wide text-gray-600">
        {company} – {dateShipped}
      </p>

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-semibold text-[#181425] leading-tight">{title}</h1>

      {/* Hero Image */}
      <div className="mx-auto max-w-[911px]">
        <div
          className={`relative overflow-hidden rounded-lg shadow-lg ${isFleetProject ? "cursor-pointer" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          <img
            src={heroImage.src || "/placeholder.svg"}
            alt={heroImage.alt}
            className={`w-full h-auto max-h-[512px] object-cover transition-all duration-300 ${isHovered && isFleetProject ? "brightness-50" : ""}`}
          />

          {isFleetProject && (
            <div
              className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                className={`text-center text-white transform transition-all duration-500 ${
                  isHovered ? "scale-100 opacity-100" : "scale-75 opacity-0"
                }`}
                style={{
                  animation: isHovered ? "bounceIn 0.6s ease-out" : "none",
                }}
              >
                <p className="text-sm md:text-base leading-relaxed">
                  This work was originally done 2019-2022.
                  <br />
                  View the 2025 Prototype Lovable here
                  <br />
                  to get an idea of my current skills! 👍
                </p>
              </div>
            </div>
          )}
        </div>

        {isFleetProject && (
          <p className="text-sm text-gray-600 text-center mt-4 italic">
            This interface represents a 2025 rework of the original 2021 design and implementation.
          </p>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Role</p>
          <p className="text-sm md:text-base text-[#181425]">{role}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Timeline</p>
          <p className="text-sm md:text-base text-[#181425]">{timeline}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Team</p>
          <p className="text-sm md:text-base text-[#181425]">{team}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Skills</p>
          <p className="text-sm md:text-base text-[#181425]">{skills}</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
