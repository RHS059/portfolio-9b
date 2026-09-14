import ProjectLayout from "../../../components/project-layout"
import ProjectHero from "../../../components/project-hero"
import ProjectSection from "../../../components/project-section"

const sections = [
  { id: "overview", title: "Overview" },
  { id: "initial-observations", title: "Initial Observations" },
  { id: "market-research", title: "Market Research" },
  { id: "competitor-research", title: "Competitor Research" },
  { id: "solution", title: "Solution" },
  { id: "final-designs", title: "Final Designs" },
  { id: "reflection", title: "Reflection" },
]

const projectData = {
  company: "Stealth Startup",
  dateShipped: "March 2024",
  title: "Making Teacher–Parent Communication Simpler and Smarter",
  heroImage: {
    src: "/teacher-parent-communication-app-mockup.png",
    alt: "Teacher-Parent Communication App Interface",
  },
  role: "Lead UX Designer",
  timeline: "3 months",
  team: "2 designers, 3 developers",
  skills: "User Research, Prototyping, Design Systems",
}

const sectionContent = [
  {
    id: "overview",
    title: "Overview",
    content: [
      {
        type: "paragraph" as const,
        content:
          "This project focused on creating a role-based messaging tool that simplifies communication between teachers and parents. The goal was to enable efficient updates by class, student, or topic while maintaining appropriate privacy boundaries.",
      },
      {
        type: "list" as const,
        content: [
          "Streamlined communication workflows",
          "Role-based access controls",
          "Topic-based message organization",
          "Mobile-first responsive design",
        ],
      },
    ],
  },
  {
    id: "initial-observations",
    title: "Initial Observations",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Through initial user interviews with teachers and parents, we identified key pain points in current communication methods. Email chains were becoming unwieldy, and important information was often buried in lengthy messages.",
      },
      {
        type: "quote" as const,
        content: "I spend more time managing parent emails than I do preparing lessons. There has to be a better way.",
      },
    ],
  },
  {
    id: "market-research",
    title: "Market Research",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Market analysis revealed a gap in purpose-built school communication tools. While general messaging platforms existed, none addressed the specific needs of educational environments with appropriate privacy controls and role-based permissions.",
      },
    ],
  },
  {
    id: "competitor-research",
    title: "Competitor Research",
    content: [
      {
        type: "paragraph" as const,
        content:
          "We analyzed existing solutions including ClassDojo, Remind, and traditional email systems. Each had limitations in either functionality, user experience, or privacy controls that our solution aimed to address.",
      },
    ],
  },
  {
    id: "solution",
    title: "Solution",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Our solution introduced a three-tier communication system: class-wide announcements, individual student updates, and topic-based discussions. This allowed for appropriate information sharing while maintaining privacy boundaries.",
      },
      {
        type: "image" as const,
        content: "/placeholder.svg?height=400&width=600&query=communication app wireframes",
        caption: "Early wireframes showing the three-tier communication structure",
      },
    ],
  },
  {
    id: "final-designs",
    title: "Final Designs",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The final design featured a clean, intuitive interface with clear visual hierarchy. Teachers could quickly send updates while parents received organized, relevant information without overwhelming notifications.",
      },
      {
        type: "image" as const,
        content: "/placeholder.svg?height=400&width=600&query=final app design mockups",
        caption: "Final high-fidelity mockups showing the teacher and parent interfaces",
      },
    ],
  },
  {
    id: "reflection",
    title: "Reflection",
    content: [
      {
        type: "paragraph" as const,
        content:
          "This project taught me the importance of understanding domain-specific needs in educational technology. The success of the prototype validated our approach to role-based communication design.",
      },
      {
        type: "list" as const,
        content: [
          "Improved teacher efficiency by 40% in prototype testing",
          "Reduced parent confusion about school communications",
          "Established foundation for scalable school communication platform",
        ],
      },
    ],
  },
]

export default function TeacherParentCommunicationProject() {
  return (
    <ProjectLayout sections={sections}>
      <div className="space-y-8 md:space-y-10">
        <ProjectHero {...projectData} />

        {sectionContent.map((section) => (
          <ProjectSection key={section.id} id={section.id} title={section.title} content={section.content} />
        ))}
      </div>
    </ProjectLayout>
  )
}
