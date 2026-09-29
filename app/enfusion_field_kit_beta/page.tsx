export default function EnfusionFieldKitBetaPage() {
  return (
    <main className="min-h-screen w-screen bg-black text-white">
      <section className="sr-only" aria-label="Project description">
        <h1>Enfusion Field Kit</h1>
        <p>
          Enfusion Field Kit is an interactive design engineering project by Reid Slaughter focused on tools and workflows for game development. The project combines product design, front-end implementation, and AI-assisted development in a working browser experience.
        </p>
        <p>
          Role: Product Designer and Design Engineer. Areas of work include product design, interaction design, prototyping, front-end development, game-development tooling, Claude Code, and ChatGPT.
        </p>
      </section>
      <iframe
        title="Enfusion Field Kit interactive demo"
        src="/enfusion-field-kit-beta/index.html?demo=1"
        className="h-screen w-full border-0"
      />
    </main>
  )
}
