import ProjectLayout from "../../../components/project-layout"
import ProjectHero from "../../../components/project-hero"
import ProjectSection from "../../../components/project-section"

const sections = [
  { id: "impact", title: "Impact" },
  { id: "the-problem", title: "The Problem" },
  { id: "users", title: "Users" },
  { id: "key-decisions", title: "Key Decisions" },
  { id: "what-i-cut", title: "What I Cut (and Why)" },
  { id: "what-i-missed", title: "What I Missed" },
  { id: "iteration", title: "Iteration" },
  { id: "results", title: "Results" },
  { id: "what-id-measure", title: "What I'd Measure" },
]

const projectData = {
  company: "Vibe Coded Design",
  dateShipped: "2025",
  title: "Arma Reforger Texture Wizard",
  heroImage: {
    src: "/arma-texture-wizard.png",
    alt: "Arma Reforger Texture Wizard interface showing texture upload zones and export options",
  },
  role: "Solo Designer & Builder",
  timeline: "1 Day",
  team: "Solo",
  skills: "Lovable (vibe-coding), Photoshop (benchmarking)",
}

const sectionContent = [
  {
    id: "impact",
    title: "Impact",
    content: [
      {
        type: "list" as const,
        content: [
          "Active use by Arma Reforger modders",
          "Zero errors reported",
          "~45 min manual workflow for 14 texture sets reduced to ~90 seconds",
          "Cost to build: $0, one day",
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
          "Arma Reforger requires two proprietary texture formats (NMO and BCR) that no standard 3D marketplace exports. Modders importing third-party models have to manually split and recombine texture channels in Photoshop, file by file.",
      },
      {
        type: "paragraph" as const,
        content:
          "For a model pack with 100 texture sets, that's 500 files opened, split, recombined, and exported by hand.",
      },
      {
        type: "paragraph" as const,
        content: "Many modders don't even have Photoshop.",
      },
      {
        type: "image-card" as const,
        content: {
          src: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Time%20To%20Convert.png",
          alt: "Side-by-side comparison of manual Photoshop workflow versus Texture Wizard conversion time",
          caption: "Manual Photoshop workflow (5 source files, channel splitting, manual recombination, 2 output files) vs. the Texture Wizard workflow (drag and drop, automatic, done)",
        },
      },
    ],
  },
  {
    id: "users",
    title: "Users",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Arma Reforger modders importing third-party models, not artists creating original textures in Substance Painter (which already exports to Reforger formats).",
      },
    ],
  },
  {
    id: "key-decisions",
    title: "Key Decisions",
    content: [
      {
        type: "decision-cards" as const,
        content: [
          {
            header: "Drag-and-Drop Input",
            text: "Users drop hundreds of files at once into the app. No file pickers, no one-at-a-time uploads. The interface accepts bulk input because that matches the real workflow. Modders work with entire model packs, not individual textures.",
            image: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Drag%20and%20Drop.png",
            imagePlaceholder: "Batch file drop workflow showing files auto-sorted into a texture set",
          },
          {
            header: "Auto-Sort by Filename",
            text: "The app groups dropped files into texture sets by name and identifies each file type by suffix (_normal, _ao, _basecolor). It then packs the correct channels automatically. This is the core automation that eliminates the manual Photoshop work.",
            image: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Multiple%20Texture%20Sets.png",
            imagePlaceholder: "Multiple texture sets managed simultaneously after auto-sort",
          },
          {
            header: "Manual Override",
            text: "Auto-sort can't catch everything. I added the ability to manually assign orphan files to specific texture sets. This was a direct result of testing with real files that broke naming conventions.",
            image: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Manual%20Override.png",
            imagePlaceholder: "Texture slots with empty AO slot showing manual upload prompt",
          },
          {
            header: "Configurable Alias System",
            text: "Different artists name files differently (_normal, _norm, _n). I built a settings page where users define what suffixes map to what texture type. I chose flexibility over zero-config, because wrong output is worse than slow input.",
            image: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Alias.png",
            imagePlaceholder: "Settings page with texture type alias configuration and filename pattern mappings",
          },
          {
            header: "Resize Textures on Export",
            text: "Game performance depends on texture resolution. Modders often need to downscale marketplace textures (4K to 2K or 1K) for performance. I added resolution selection per texture set so users can resize during export rather than making a separate pass in Photoshop.",
            image: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Resize.png",
            imagePlaceholder: "Output resolution dropdown showing 512x512 through 4096x4096 options",
          },
          {
            header: "Batch Export",
            text: "The first version only had individual downloads. At 200 output files, that's its own bottleneck. I added zip export but kept individual downloads for partial re-exports.",
            image: "https://raw.githubusercontent.com/RHS059/portfolio_images/refs/heads/main/Download%20All.png",
            imagePlaceholder: "Top action bar with Settings, Download All, and Add Texture Set buttons",
          },
        ],
      },
    ],
  },
  {
    id: "what-i-cut",
    title: "What I Cut (and Why)",
    content: [
      {
        type: "paragraph" as const,
        content:
          "I wanted to add a 3D material preview so users could verify textures on a rendered object before downloading. I couldn't afford it because I ran out of Lovable credits with a $0 budget. The core value is batch automation, not visual verification. Modders check textures in-engine within minutes anyway.",
      },
      {
        type: "paragraph" as const,
        content:
          "I can rationalize the cut, but honestly the real constraint was resources, not product strategy. Both are true.",
      },
    ],
  },
  {
    id: "what-i-missed",
    title: "What I Missed",
    content: [
      {
        type: "paragraph" as const,
        content:
          "No file-upload button. Drag-and-drop was the only input method. I designed from my own workflow and didn't consider the obvious fallback. Basic accessibility gap I should have caught on day one.",
      },
    ],
  },
  {
    id: "iteration",
    title: "Iteration",
    content: [
      {
        type: "paragraph" as const,
        content: "After sharing with other modders:",
      },
      {
        type: "table" as const,
        content: {
          headers: ["What broke", "What I changed"],
          rows: [
            ["Alias defaults too narrow", "Expanded defaults, made settings more prominent"],
            ["Downloading 200 files individually", "Added zip export"],
            ["Files that broke naming conventions", "Added manual file assignment"],
          ],
        },
      },
    ],
  },

  {
    id: "what-id-measure",
    title: "What I'd Measure",
    content: [
      {
        type: "list" as const,
        content: [
          "Auto-detection accuracy: what percentage of files get sorted correctly without override",
          "Settings engagement: are defaults working or is everyone reconfiguring?",
          "Batch size: solving the scale problem, or just replacing Photoshop for small jobs?",
        ],
      },
    ],
  },
]

export default function ArmaReforgerTextureWizardProject() {
  return (
    <ProjectLayout sections={sections}>
      <div className="space-y-8 md:space-y-10">
        <ProjectHero {...projectData} />

        {/* Full-width CTA button */}
        <a
          href="https://preview--texture-fusion-wizard.lovable.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#3b2d56] text-white hover:bg-[#4d3d6e] hover:shadow-lg hover:shadow-[#685c84]/25 active:scale-[0.99]"
        >
          Try the Texture Wizard live →
        </a>

        {sectionContent.map((section) => (
          <ProjectSection key={section.id} id={section.id} title={section.title} content={section.content} />
        ))}
      </div>
    </ProjectLayout>
  )
}
