import ProjectLayout from "../../../components/project-layout"
import ProjectHero from "../../../components/project-hero"
import ProjectSection from "../../../components/project-section"

const APP_URL = "/enfusion_field_kit_beta"

const sections = [
  { id: "impact", title: "Impact" },
  { id: "the-problem", title: "The Problem" },
  { id: "users", title: "Users" },
  { id: "what-it-does", title: "What It Does" },
  { id: "how-a-task-works", title: "How a Task Works" },
  { id: "design-decisions", title: "Design Decisions" },
  { id: "try-it", title: "Try It" },
]

const projectData = {
  company: "Independent project",
  dateShipped: "2026",
  title: "Enfusion Field Kit",
  heroImage: {
    src: "/enfusion-field-kit.webp",
    alt: "Enfusion Field Kit arranging three texture tiles into one combined sheet beside a 3D preview",
  },
  prototypeHref: APP_URL,
  prototypeLabel: "Open the app",
  role: "Product Designer & Design Engineer",
  timeline: "2025 – 2026",
  team: "Solo",
  responsibilities: "Product definition, interaction design, visual design, front-end implementation, and testing",
  tools: "HTML, CSS, JavaScript, Three.js",
  aiTools: "Claude Code, ChatGPT",
  outcome: "A 14-set texture job cut from ~45 minutes to ~90 seconds",
}

const sectionContent = [
  {
    id: "impact",
    title: "Impact",
    content: [
      {
        type: "stat" as const,
        content: { value: "30×", label: "faster texture conversion for 14 texture sets", from: "~45 minutes", to: "~90 seconds" },
      },
      {
        type: "list" as const,
        content: [
          "Four modding chores in one browser tab",
          "No Photoshop needed",
          "Files never leave the modder's computer",
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
          "Arma Reforger needs textures in two packed formats, BCR and NMO, that no standard 3D marketplace exports. A modder importing a third-party model has to split and recombine image channels by hand in Photoshop, file by file. Many modders don't have Photoshop.",
      },
      {
        type: "paragraph" as const,
        content:
          "Textures are only the first chore. Models arrive with several materials that should share one sheet, textures that are larger than the game needs, and material files that were created but left empty. Each fix lived in a different tool.",
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
          "Arma Reforger modders who bring in third-party models. They know the game's editor well, but they are not necessarily texture artists, and they work with whole model packs at a time.",
      },
    ],
  },
  {
    id: "what-it-does",
    title: "What It Does",
    content: [
      {
        type: "decision-cards" as const,
        content: [
          {
            header: "Atlas combine",
            text: "Merges the textures of a model's separate parts into one sheet and updates the model to match. Fewer materials means less work for the game on every frame. A 3D preview shows the result before export.",
            image: "/enfusion-field-kit-textures.webp",
            imagePlaceholder: "Atlas combine step with five texture images assigned to each of three parts",
          },
          {
            header: "Texture pack",
            text: "Drop in a material's five standard images and the kit sorts them by filename and builds the two files the game expects. This is the job that used to take Photoshop.",
            image: "/enfusion-field-kit-pack.webp",
            imagePlaceholder: "Texture pack step showing normal, ambient occlusion, metallic, base color and roughness maps",
          },
          {
            header: "Resize",
            text: "Marketplace textures are often 4K when 2K or 1K is enough. Pick a size per file or for the whole batch, and undo any of it.",
            image: "/enfusion-field-kit-resize.webp",
            imagePlaceholder: "Resize step listing five texture files with a target size selected for each",
          },
          {
            header: "Material patch",
            text: "Scans a mod folder for material files left empty and fills in a working definition. Every change is previewed first, with an optional backup.",
            image: "/enfusion-field-kit-patch.webp",
            imagePlaceholder: "Material patch step asking for a mod folder to scan",
          },
        ],
      },
    ],
  },
  {
    id: "how-a-task-works",
    title: "How a Task Works",
    content: [
      {
        type: "paragraph" as const,
        content:
          "Every task follows the same three steps: add files, check them, then run. Only the current step is on screen, and the stepper lets you go back. The kit opens each task on the furthest step that is ready, so returning users land on the action.",
      },
      {
        type: "image" as const,
        content: "/enfusion-field-kit.webp",
        caption: "Atlas combine, step three: drag tiles to arrange the sheet, check the 3D preview, export",
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
            header: "Plain words first",
            text: "The first version spoke in engine shorthand: BCR, NMO, CRM, rewrite UVs. The task names stay, because modders search for them, but every task now carries a one-line description anyone can read.",
          },
          {
            header: "One action per step",
            text: "Each step has a single filled button, top right. Everything else is outlined. You never have to work out which button finishes the job.",
          },
          {
            header: "A sample to learn on",
            text: "The kit opens with a sample model loaded, so a newcomer can click through all four tasks before finding files of their own.",
          },
          {
            header: "Nothing uploaded",
            text: "All processing happens in the browser. Mod assets are often unreleased or licensed, so they stay on the modder's computer.",
          },
        ],
      },
    ],
  },
  {
    id: "try-it",
    title: "Try It",
    content: [
      {
        type: "paragraph" as const,
        content: "The app runs in any modern desktop browser and opens with the sample model loaded.",
      },
      {
        type: "button" as const,
        content: { text: "Open Enfusion Field Kit", url: APP_URL },
      },
    ],
  },
]

export default function EnfusionFieldKitProject() {
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
