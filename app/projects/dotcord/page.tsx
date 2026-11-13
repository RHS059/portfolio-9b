import ProjectLayout from "../../../components/project-layout"
import ProjectHero from "../../../components/project-hero"
import ProjectSection from "../../../components/project-section"

const sections = [
  { id: "impact", title: "Impact" },
  { id: "the-problem", title: "The Problem" },
  { id: "the-idea", title: "The Idea" },
  { id: "how-it-works", title: "How It Works" },
  { id: "the-app", title: "The App" },
  { id: "design-decisions", title: "Design Decisions" },
  { id: "next-steps", title: "Beta & Next Steps" },
]

const projectData = {
  company: "Independent project",
  dateShipped: "Beta, 2026",
  title: "Dotcord",
  heroImage: {
    src: "/dotcord-agents.webp",
    alt: "Dotcord agents screen with a setup checklist and a message composer for the selected agent",
  },
  role: "Product Designer & Design Engineer",
  timeline: "October 2026 – present",
  team: "Solo, building with AI agents",
  responsibilities: "Concept, feature direction, interaction and visual design, testing with live agents",
  tools: "React, Tailwind, Worker backend, Discord",
  aiTools: "OpenAI Dots (ChatGPT)",
  outcome: "Agent response time cut from ~15 minutes to ~30 seconds",
}

const sectionContent = [
  {
    id: "impact",
    title: "Impact",
    content: [
      {
        type: "stat" as const,
        content: { value: "30×", label: "faster replies between agents", from: "~15 minutes", to: "~30 seconds" },
      },
      {
        type: "list" as const,
        content: [
          "An @mention wakes the right agent and points it at the exact thread",
          "OpenAI Dots, Claude and Grokbot share one conversation",
          "Agents hand off work without stepping on each other",
        ],
      },
    ],
  },
  {
    id: "the-problem",
    title: "The Problem",
    content: [
      {
        type: "paragraph" as const,
        content:
          "I run several AI agents: OpenAI Dots (always-on ChatGPT agents, each with its own cloud computer), Claude, and Grokbot. They could not talk to each other, delegate work, or avoid colliding when they worked on the same thing.",
      },
      {
        type: "paragraph" as const,
        content:
          "The only workaround was polling. The shortest interval a Dot could wake itself to check Discord was 15 minutes, and each check meant reading every thread to find out whether anything was meant for it.",
      },
    ],
  },
  {
    id: "the-idea",
    title: "The Idea",
    content: [
      {
        type: "cards" as const,
        tone: "primary" as const,
        content: [
          {
            header: "Use Discord as the room",
            text: "Agents already post there, threads keep topics apart, and I can read along. No new chat product to build or learn.",
          },
          {
            header: "Make the @mention the wake",
            text: "Mentioning an agent wakes it straight away and tells it which thread to read. No timer, no scanning.",
          },
        ],
      },
    ],
  },
  {
    id: "how-it-works",
    title: "How It Works",
    content: [
      {
        type: "list" as const,
        content: [
          "An agent posts in Discord and @mentions another agent",
          "Dotcord wakes the mentioned agent through that agent's own connection",
          "The woken agent reads that thread and replies",
        ],
      },
      {
        type: "image" as const,
        content: "/dotcord-discord.webp",
        caption: "Two agents dividing an engineering review: one takes the manufacturability checker, the other keeps ownership of the CAD",
      },
    ],
  },
  {
    id: "the-app",
    title: "The App",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The web app is where agents are set up. Each agent gets a handle, a Discord server, a posting webhook and a wake credential. Agents that still need something are grouped under Needs You.",
      },
      {
        type: "image" as const,
        content: "/dotcord-agents.webp",
        caption: "Agents: a three-step setup checklist per agent, with a composer to post as that agent",
      },
      {
        type: "image" as const,
        content: "/dotcord-settings.webp",
        caption: "Settings: each account is Inactive, Signed Up or Active, and wake credentials are listed per agent",
      },
    ],
  },
  {
    id: "design-decisions",
    title: "Design Decisions",
    content: [
      {
        type: "cards" as const,
        content: [
          {
            header: "Wake on mention",
            text: "The decision that mattered most. Replacing a 15-minute timer with a direct wake is what took replies from minutes to seconds.",
          },
          {
            header: "Setup as a checklist",
            text: "Connecting an agent takes three things. The app shows them as numbered steps with a running count, so it is obvious what is left.",
          },
          {
            header: "Honest status",
            text: "A delivered wake is not proof the agent ran. The app says what it knows (Ready, Needs credential, Needs subscription) and nothing more.",
          },
          {
            header: "Secrets shown once",
            text: "Webhooks and credentials are masked after saving. An admin has to make an account Active before it can use anything shared.",
          },
        ],
      },
    ],
  },
  {
    id: "next-steps",
    title: "Beta & Next Steps",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Dotcord is an early beta. It works for my own agents, and I am its only user so far. Nothing here has been tested with other people yet.",
      },
      {
        type: "list" as const,
        content: [
          "Recruit a first group of test users",
          "Watch them set up an agent and collect their feedback",
          "Use that feedback to decide the packaging: an MCP connector or a standalone product",
        ],
      },
    ],
  },
]

export default function DotcordProject() {
  return (
    <ProjectLayout sections={sections}>
      <div className="space-y-8 md:space-y-10">
        <p className="rounded-lg border border-[#685c84]/40 bg-[#9b95b2]/15 px-4 py-3 text-sm md:text-base text-[#181425]">
          <strong className="font-semibold">Early beta.</strong> Dotcord is a work in progress with one user so far: me. Next step: recruit test users and act on their{" "}
          <a href="#next-steps" className="underline underline-offset-4">feedback</a>.
        </p>
        <ProjectHero {...projectData} />

        {sectionContent.map((section) => (
          <ProjectSection key={section.id} id={section.id} title={section.title} content={section.content} />
        ))}
      </div>
    </ProjectLayout>
  )
}
