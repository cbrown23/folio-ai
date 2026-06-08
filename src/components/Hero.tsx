import config from '../../folio.config'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-mono text-indigo-400 mb-4 tracking-widest uppercase">
          Available for SA + AI roles
        </p>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          {config.owner.name}
        </h1>

        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mb-4 leading-relaxed">
          {config.owner.title}
        </p>

        <p className="text-base text-slate-500 max-w-xl mb-10 leading-relaxed">
          I design cloud-native systems and AI-ready infrastructure. This site is built with the
          same stack I&apos;d propose to a client — Next.js, a ReAct agent loop, and an embedded
          vector store for semantic search.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href="#work"
            className="px-6 py-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            View My Work
          </a>
          <a
            href="#how-it-works"
            className="px-6 py-3 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-colors"
          >
            How This Site Works
          </a>
        </div>

        {/* Skill chips */}
        <div className="flex flex-wrap gap-2 mt-12">
          {[
            'Kubernetes',
            'Container Platforms',
            'Cloud-Native Architecture',
            'AI Systems Design',
            'GitOps / MLOps',
            'Observability',
          ].map((skill) => (
            <span
              key={skill}
              className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-400"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
