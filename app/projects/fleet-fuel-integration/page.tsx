import ProjectLayout from "../../../components/project-layout"
import ProjectHero from "../../../components/project-hero"
import ProjectSection from "../../../components/project-section"

const sections = [
  { id: "impact", title: "Impact" },
  { id: "overview", title: "Overview" },
  { id: "the-problem-surface-level", title: "The Problem (surface level)" },
  { id: "the-problem-under-the-hood", title: "The Problem (under the hood)" },
  { id: "research-and-discovery", title: "Research & Discovery" },
  { id: "opportunity", title: "Opportunity" },
  { id: "how-i-knew-what-to-do", title: "How I Knew What to Do" },
  { id: "system-architecture", title: "System Architecture" },
  { id: "planning-collaboration", title: "Planning & Collaboration" },
  { id: "results", title: "Results" },
  { id: "retrospective", title: "Retrospective" },
]

const projectData = {
  company: "Collective Data",
  dateShipped: "Summer 2021",
  title: "Streamlining Fuel Management for Large Fleets",
  heroImage: {
    src: "https://raw.githubusercontent.com/RHS059/portfolio-9b/v0/fleet-preview-thumbnails/public/fleet-overview.webp",
    alt: "Fleet management dashboard showing fuel transaction data and analytics",
  },
  role: "UX Designer",
  timeline: "2019 – 2022",
  team: "UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager",
  skills: "Wireframes, Mockups",
}

const sectionContent = [
  {
    id: "impact",
    title: "Impact",
    content: [
      {
        type: "list" as const,
        content: [
          "Improved time to resolve data issues by 90% (weeks to hours)",
          "Immediate notification of data issues via email",
          "Data issues (when they occur), are detected immediately",
          "Users avoid costly data cleanup",
        ],
      },
    ],
  },
  {
    id: "overview",
    title: "Overview",
    content: [
      {
        type: "paragraph" as const,
        content:
          "I proposed and designed a new framework to address infrastructural issues that were repeatedly wasting company engineering resources to resolve.",
      },
      {
        type: "paragraph" as const,
        content:
          "Collective Data? Construction, utilities, & law enforcement agencies utilize Collective Data's enterprise asset management software, Collective Fleet, to track, among other things, fuel usage for their fleet of vehicles. Collective Fleet can also integrate with third party fuel vendor apps to synchronize data.",
      },
    ],
  },
  {
    id: "the-problem-surface-level",
    title: "The Problem (surface level)",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The company's engineering resources were being wasted dealing with re-occurring support tickets caused by infrastructural issues with the fuel transaction import. Engineers could not focus on the main product.",
      },
    ],
  },
  {
    id: "the-problem-under-the-hood",
    title: "The Problem (under the hood)",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The middleware handling the data was not robust enough to handle certain scenarios. Simple scenarios such as 'Does this vehicle exist in the system?' did not gracefully fail or notify users. A data issue could persist for months before anyone noticed. Data clean-up is expensive for users.",
      },
    ],
  },
  {
    id: "research-and-discovery",
    title: "Research & Discovery",
    content: [
      {
        type: "paragraph" as const,
        content:
          "To expand my understanding of the problem, I met with internal support agents and account managers. I also interviewed representatives from the third party companies we were importing from to establish a knowledge base of the data they gathered and what was technically possible. Our system could be adjusted to detect and notify users of when problems happen and how to resolve them.",
      },
      {
        type: "paragraph" as const,
        content:
          "My new design would first detect missing or bad data based on preset metrics (which could be updated later). As seen in the service flow below, if bad data is detected, the records are flagged and the end-user is notified allowing them to take action.",
      },
    ],
  },
  {
    id: "opportunity",
    title: "Opportunity",
    content: [
      {
        type: "cards" as const,
        content: [
          {
            header: "Traditional Approach",
            text: "Create a Dev support ticket. May be deprioritized and not started for 6 months. Any future issues require Dev, as only they have backend access.",
          },
          {
            header: "Design Solution",
            text: "Design a solution. No future Dev time required for this issue. Reduces support ticket open time. Easy for app devs to expand later.",
          },
        ],
      },
    ],
  },
  {
    id: "how-i-knew-what-to-do",
    title: "How I Knew What to Do",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Years of working for Collective Data gave me extensive product middleware knowledge. This included both functionality and database perspectives. I worked daily with app devs and software engineers, learning from them.",
      },
      {
        type: "paragraph" as const,
        content:
          "Leveraging this, I mapped out the information architecture and user‑flows. Research revealed that customers could be integrated with multiple vendors. Some preferred odometers from source A and fuel transactions from source B.",
      },
      {
        type: "paragraph" as const,
        content:
          "To address this, I added an 'integration' field to differentiate imported transactions by source and what data was brought in.",
      },
    ],
  },
  {
    id: "system-architecture",
    title: "System Architecture",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The following diagrams illustrate the original 2021 system architecture and data flow that was designed to handle fuel transaction imports and error detection.",
      },
      {
        type: "image-card" as const,
        content: {
          src: "/fuel-integration-hierarchy.png",
          alt: "System hierarchy diagram showing relationships between fuel log assets, integrations, and data objects",
          caption: "Object hierarchy and field relationships (Original 2021 design)",
        },
      },
      {
        type: "image-card" as const,
        content: {
          src: "/fuel-integration-event-flow.png",
          alt: "Event flow diagram showing the process from nightly integration runs through user approval",
          caption: "Integration event flow and approval process (Original 2021 design)",
        },
      },
    ],
  },
  {
    id: "planning-collaboration",
    title: "Planning & Collaboration",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Throughout the design process, I collaborated closely with the application development team through whiteboarding sessions to map out business logic and system requirements.",
      },
      {
        type: "image-card" as const,
        content: {
          src: "/whiteboard-fuel-logic.jpg",
          alt: "Whiteboard showing fuel transaction logic with conditions for putting transactions on hold vs instant import",
          caption: "Whiteboarding with the application development team - Business logic planning",
        },
      },
      {
        type: "image-card" as const,
        content: {
          src: "/whiteboard-collective-smiles.jpg",
          alt: "Whiteboard showing comprehensive system planning with fuel card concepts, UI wireframes, and problem identification",
          caption: "Whiteboarding with the application development team - Early conceptual planning and UI exploration",
        },
      },
    ],
  },
  {
    id: "results",
    title: "Results",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Roughly 35% of our customers have at least one fuel integration, with half using the advanced version (as of July 2022). The improved module now groups records by vendor, month, and fuel type. Errors can be resolved directly within the system.",
      },
      {
        type: "list" as const,
        content: [
          "Improved time to resolve data issues by 90% (weeks to hours)",
          "Immediate notification of data issues via email",
          "Data issues are detected immediately when they occur",
          "Users avoid costly data cleanup",
        ],
      },
      {
        type: "button" as const,
        content: {
          text: "View Prototype on",
          logo: "/lovable-logo.png",
          logoAlt: "Lovable",
          url: "https://preview--fleet-ai-pilot.lovable.app/fuel",
        },
      },
    ],
  },
  {
    id: "retrospective",
    title: "Retrospective",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The time app devs spent fixing data after third-party errors dropped significantly. Support agents could handle most questions thanks to a clearer UI.",
      },
      {
        type: "paragraph" as const,
        content: "The internal seminar I led for the client trainers also went well.",
      },
      {
        type: "paragraph" as const,
        content:
          "But—this shouldn't have taken 8 years. A sales rep originally designed the feature in 2011, bypassing design/dev. I redesigned it after joining in 2017, shipping in 2019.",
      },
      {
        type: "paragraph" as const,
        content:
          "If the SWE team had been more available, some functionality could've gone into the backend for better performance at scale.",
      },
    ],
  },
]

export default function FleetFuelIntegrationProject() {
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
