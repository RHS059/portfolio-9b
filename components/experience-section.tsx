export default function ExperienceSection() {
  const experiences = [
    {
      title: "UX DESIGN EXPERT",
      company: "Mercor Intelligence (Contract)",
      period: "Aug 2025 to Present",
      description:
        "Providing UX design expertise to improve AI models for a top AI lab. Evaluating and refining model outputs to align with design best practices and user experience standards.",
      side: "left" as const,
    },
    {
      title: "AI TRAINER",
      company: "Outlier (Contract)",
      period: "Apr 2024 to Aug 2025",
      description:
        "Audited AI outputs across text, image, and audio for alignment with project guidelines. Reviewed HTML, CSS, and API call outputs for technical accuracy. Provided structured evaluations to improve model reliability and instruction-following.",
      side: "right" as const,
    },
    {
      title: "PRODUCT DESIGNER (Contract)",
      company: "TealHQ",
      period: "Jan 2024 to Apr 2024",
      description:
        "Designed job search data visualizations and prototypes in Figma. Partnered with leadership to workshop AI-powered product concepts that helped users understand their job search pipeline and identify bottlenecks.",
      side: "left" as const,
    },
    {
      title: "SR PRODUCT DESIGNER (Contract)",
      company: "OCLC, Inc via TekSystems",
      period: "Jul 2022 to Nov 2022",
      description:
        "Designed and launched native mobile app WorldCat Find for a global library organization serving 540M+ bibliographic records. Reached 4.4 star rating and 5,000+ downloads. Streamlined the design-to-dev handoff by initiating early collaboration with engineering, resulting in faster turnaround. Contributed to the mobile design system using Google Material 2.",
      side: "right" as const,
    },
    {
      title: "UX DESIGNER",
      company: "Collective Data",
      period: "Oct 2017 to Jul 2022",
      description:
        "Redesigned core workflows in a B2B fleet and asset management platform. Reduced support ticket close time by 90%, customer upgrade cycle from 6+ months to under 2 weeks, and new customer onboarding time by 92% through redesign of fuel transaction import workflows. Built accessible Angular components using Figma and Google Material Design System.",
      side: "left" as const,
    },
    {
      title: "FREELANCE UX / WEB DESIGNER",
      company: "Self-employed",
      period: "Jan 2022 to Present",
      description:
        "Designed client websites in Webflow resulting in increased sales and engagement. Built a Python script to automate Instagram-to-Webflow content migration. Shipped side projects including the Arma Reforger Texture Wizard, a browser-based texture conversion tool used by game modders.",
      side: "right" as const,
    },
  ]

  return (
    <section id="experience" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-bold text-[#181425] mb-16 text-left">Experience</h2>

        {/* Mobile: vertical stack */}
        <div className="md:hidden space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-[#685c84]/30" />
              {/* Dot */}
              <div className="absolute left-0 top-1.5 w-[16px] h-[16px] rounded-full bg-[#685c84] border-4 border-gray-50 z-10" />
              {/* Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-sm font-medium text-[#685c84] mb-1">{exp.period}</p>
                <h3 className="text-xl font-bold text-[#181425] mb-1">{exp.title}</h3>
                <p className="text-[#685c84] font-medium mb-3">{exp.company}</p>
                <p className="text-[#181425] leading-relaxed">{exp.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: alternating left/right timeline */}
        <div className="hidden md:block relative">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#685c84]/30 -translate-x-1/2" />

          <div className="space-y-12">
            {experiences.map((exp, index) => (
              <div key={index} className="relative flex items-start">
                {/* Center dot */}
                <div className="absolute left-1/2 top-6 w-[18px] h-[18px] rounded-full bg-[#685c84] border-4 border-gray-50 -translate-x-1/2 z-10" />

                {/* Left side content */}
                <div className="w-1/2 pr-12">
                  {exp.side === "left" ? (
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 ml-auto max-w-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <p className="text-sm font-medium text-[#685c84] mb-1">{exp.period}</p>
                      <h3 className="text-xl font-bold text-[#181425] mb-1">{exp.title}</h3>
                      <p className="text-[#685c84] font-medium mb-3">{exp.company}</p>
                      <p className="text-[#181425] leading-relaxed">{exp.description}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end h-full pt-4">
                      <p className="text-sm font-medium text-[#685c84] text-right">{exp.period}</p>
                    </div>
                  )}
                </div>

                {/* Right side content */}
                <div className="w-1/2 pl-12">
                  {exp.side === "right" ? (
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 max-w-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <p className="text-sm font-medium text-[#685c84] mb-1">{exp.period}</p>
                      <h3 className="text-xl font-bold text-[#181425] mb-1">{exp.title}</h3>
                      <p className="text-[#685c84] font-medium mb-3">{exp.company}</p>
                      <p className="text-[#181425] leading-relaxed">{exp.description}</p>
                    </div>
                  ) : (
                    <div className="flex items-center h-full pt-4">
                      <p className="text-sm font-medium text-[#685c84]">{exp.period}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
