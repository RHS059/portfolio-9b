import ProjectLayout from "../../../components/project-layout"
import ProjectHero from "../../../components/project-hero"
import ProjectSection from "../../../components/project-section"

const sections = [
  { id: "impact", title: "Impact" },
  { id: "the-problem", title: "The Problem" },
  { id: "users", title: "Users" },
  { id: "research", title: "Research" },
  { id: "key-decisions", title: "Key Decisions" },
  { id: "what-went-wrong", title: "What Went Wrong" },
  { id: "iteration", title: "Iteration" },
  { id: "what-id-do-differently", title: "What I'd Do Differently" },
]

const projectData = {
  company: "OCLC, Inc via TekSystems",
  dateShipped: "2022",
  title: "WorldCat Find: Library Search on Mobile",
  heroImage: {
    src: "/worldcat-hero.png",
    alt: "WorldCat Find mobile app showing search results and library locations",
  },
  role: "Senior UX Designer (W2 Contract)",
  timeline: "Jul 2022 to Nov 2022",
  team: "UX Designer, UI Specialist, Developer, Product Owner",
  skills: "Figma, Google Material 2, User Research, Native Mobile Design",
}

const sectionContent = [
  {
    id: "impact",
    title: "Impact",
    content: [
      {
        type: "list" as const,
        content: [
          "Beta launched on iOS App Store and Google Play Store in Q4 2022",
          "Full launch February 2023",
          "4.4 star app store rating",
          "5,000+ downloads as of August 2024",
          "Brought library search to mobile for 124,000+ active users",
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
          "WorldCat is the largest online library catalog in the world, with over 540 million bibliographic records in 483 languages. It had a responsive website, but no native mobile app. Users searching for library materials on their phones were getting a scaled-down desktop experience, not a mobile-first one.",
      },
      {
        type: "paragraph" as const,
        content:
          "The organization needed a native iOS and Android app that gave users fast access to search, format filtering, library locations, and inter-library loan information. My job was to define the MVP scope and design every screen.",
      },
      {
        type: "placeholder-image" as const,
        content: {
          description:
            "WorldCat.org responsive site on a mobile device showing cramped desktop-oriented layout vs. the native app concept showing a mobile-first search experience",
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
          "The team's baseline assumption was that most WorldCat users were librarians or institutional staff. Previous research from 2017 suggested this. That assumption was wrong.",
      },
      {
        type: "cards" as const,
        content: [
          {
            header: "124,118 active users",
            text: "Between Feb 2021 and Nov 2021. Of those, 117,161 were non-librarians. The user base was overwhelmingly professors, students, and researchers, not library staff.",
          },
          {
            header: "1,821 accounts with 20+ saved items",
            text: "Users were building and maintaining lists of library materials for ongoing research. This wasn't casual browsing. These were repeat users with sustained workflows.",
          },
        ],
      },
      {
        type: "paragraph" as const,
        content:
          "This changed everything about how we prioritized features. We weren't designing for librarians managing catalogs. We were designing for researchers hunting down specific, often rare, materials across multiple libraries.",
      },
    ],
  },
  {
    id: "research",
    title: "Research",
    content: [
      {
        type: "paragraph" as const,
        content:
          "The 2017 research was outdated and built on incorrect assumptions about who our users were. I pushed for new user interviews, and I made a specific call that shaped the rest of the project: I convinced the product owner to demo the responsive website during those interviews instead of showing abstract concepts.",
      },
      {
        type: "paragraph" as const,
        content:
          "The product owner's original plan was to run standard interview scripts. My argument was that putting real UI in front of users would surface behaviors and pain points we'd never find through questions alone. We could watch people struggle in real time instead of asking them to remember past struggles.",
      },
      {
        type: "paragraph" as const,
        content:
          "It worked. The interviews revealed four key patterns:",
      },
      {
        type: "decision-cards" as const,
        content: [
          {
            header: "Non-Fiction Focus",
            text: "The vast majority of users searched for non-fiction. This meant our search results and filtering needed to prioritize academic and reference materials, not general browsing.",
            imagePlaceholder: "Icon of an open non-fiction book representing the primary content type users searched for",
          },
          {
            header: "Inter-Library Loan is Core",
            text: "Users regularly used WorldCat to find bibliographic info for fulfillment requests. The ILL flow wasn't a secondary feature. It was a primary reason people came to the platform.",
            imagePlaceholder: "Icon of a person researching with a magnifying glass, representing the ILL discovery workflow",
          },
          {
            header: "Niche and Rare Materials",
            text: "Users came to WorldCat specifically because their local library didn't have what they needed. They were searching across library systems to find rare or specialized materials. Generic search wasn't enough.",
            imagePlaceholder: "Icon of a diamond representing rare and specialized library materials",
          },
          {
            header: "Holdings Info, Not Orders",
            text: "Many users used the ILL feature to improve their own library's holdings information, not to actually order anything. We'd assumed ILL meant transactions. For many users, it meant research.",
            imagePlaceholder: "Icon of a person reading, representing content accessibility and holdings research",
          },
        ],
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
            header: "Use the Responsive Site as the MVP Base",
            text: "Rather than designing from scratch, I pushed to use the recently launched responsive website as the foundation for the mobile app. Same information architecture, same core flows, adapted for native mobile patterns. This cut weeks off the wireframing phase and let us spend more time on the problems that were actually unique to mobile.",
            imagePlaceholder: "Side-by-side comparison of the responsive website layout and the native mobile app adaptation showing shared IA",
          },
          {
            header: "Standardized Header System",
            text: "I wasn't the first designer on this project. Some views had headers, some didn't. There was no consistency. I standardized a header component across every screen. Beyond visual consistency, the header became functional: it changes between 'Browsing' and 'Viewing' states to tell users whether they're looking at a list of formats or a specific edition.",
            imagePlaceholder: "Two mobile screens showing the header in 'Browsing Formats & Editions' state vs. 'Viewing' state for a specific edition",
          },
          {
            header: "Clarified Holdings Copy",
            text: "The original design said something like '5 copies at 23 libraries.' This was ambiguous. Does that mean 5 copies total across 23 libraries? Or 5 copies at each of 23 libraries? And what format? Hardcover? Audiobook? I rewrote the copy to specify format and clarify the relationship between copies and locations. Small change, big reduction in confusion.",
            imagePlaceholder: "Before/after comparison: original ambiguous copy '5 copies at 23 libraries' vs. updated copy specifying 'This hardcover edition has 5 copies available at 23 nearby libraries'",
          },
          {
            header: "Advanced Search on Mobile",
            text: "Both the legacy and responsive sites had advanced search with complex query building. Users needed this on mobile too. I adapted the desktop interaction patterns to work within mobile constraints using the UI team's design system components, preserving the power of multi-criteria search without overwhelming a small screen.",
            imagePlaceholder: "Mobile screen showing advanced search panel with multiple criteria fields (author, title, date, subject) adapted from the desktop layout",
          },
        ],
      },
    ],
  },
  {
    id: "what-went-wrong",
    title: "What Went Wrong",
    content: [
      {
        type: "paragraph" as const,
        content:
          "This was my first senior role. I had the title and the responsibility, but I hadn't yet learned how to use the authority that comes with it.",
      },
      {
        type: "paragraph" as const,
        content:
          "The biggest problem: I let work get siloed. Tasks were assigned and completed in isolation. When I had questions about how a current task would impact previous or future work, I let those questions get tabled instead of insisting they be addressed.",
      },
      {
        type: "paragraph" as const,
        content:
          "The result was predictable. A later task would surface a dependency on something we'd already designed, and we'd have to go back and redesign it. Double work. Wasted time. Exactly the kind of thing a senior designer is supposed to prevent.",
      },
      {
        type: "paragraph" as const,
        content:
          "I also could have done a better job explaining to the team why working holistically (looking at the full flow, not just the current screen) leads to better results. I knew it intuitively but I didn't articulate it clearly enough to change how the team operated.",
      },
    ],
  },
  {
    id: "iteration",
    title: "Iteration",
    content: [
      {
        type: "table" as const,
        content: {
          headers: ["What I found", "What I changed"],
          rows: [
            [
              "Users assumed the app was built for librarians",
              "Reframed the entire design around researchers, students, and professors based on updated user data",
            ],
            [
              "Inconsistent headers across views",
              "Standardized a header system with contextual states (Browsing vs. Viewing)",
            ],
            [
              "Ambiguous holdings copy caused confusion",
              "Rewrote copy to specify format and clarify copy/location relationship",
            ],
            [
              "Work was siloed, causing rework",
              "Started initiating cross-task reviews with the developer and UI specialist earlier in the process",
            ],
          ],
        },
      },
    ],
  },
  {
    id: "what-id-do-differently",
    title: "What I'd Do Differently",
    content: [
      {
        type: "list" as const,
        content: [
          "Push harder for holistic design reviews instead of letting tasks stay siloed. The rework was avoidable.",
          "Exercise leadership authority earlier. Having the title means nothing if you don't use it to protect the team's time and the product's coherence.",
          "Advocate for post-launch analytics tracking. The app launched with a 4.4 star rating, but I don't have granular data on which features drove satisfaction or where users dropped off.",
          "Document the decision to use the responsive site as the MVP base more formally. It was the right call but it was made in conversation, not in a artifact the team could reference later.",
        ],
      },
    ],
  },
]

export default function WorldCatFindProject() {
  return (
    <ProjectLayout sections={sections}>
      <div className="space-y-8 md:space-y-10">
        <ProjectHero {...projectData} />

        <a
          href="https://www.worldcat.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#3b2d56] text-white hover:bg-[#4d3d6e] hover:shadow-lg hover:shadow-[#685c84]/25 active:scale-[0.99]"
        >
          Visit WorldCat.org →
        </a>

        {sectionContent.map((section) => (
          <ProjectSection key={section.id} id={section.id} title={section.title} content={section.content} />
        ))}
      </div>
    </ProjectLayout>
  )
}
