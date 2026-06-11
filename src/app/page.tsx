export const revalidate = 300

import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import CaseStudies from '@/components/CaseStudies'
import Architecture from '@/components/Architecture'
import ChatButton from '@/components/ChatButton'
import Logo from '@/components/Logo'
import config from '../../folio.config'

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <CaseStudies />
        <Architecture />

        {/* About stub */}
        <section id="about" className="py-24 border-t border-slate-800/60">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
              Background
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">About</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Content coming soon. Based in {config.owner.location}.
            </p>
          </div>
        </section>

        {/* How It Works stub */}
        <section id="how-it-works" className="py-24 border-t border-slate-800/60">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
              Under the Hood
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">How This Site Works</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Architecture walkthrough coming soon — ReAct agent loop, tool definitions, vector
              store, and system diagram.
            </p>
          </div>
        </section>

        {/* Contact stub */}
        <section id="contact" className="py-24 border-t border-slate-800/60">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
              Get in Touch
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Let&apos;s Talk</h2>
            <p className="text-slate-400 max-w-xl leading-relaxed mb-8">
              I&apos;m open to SA and AI architecture roles. Reach out directly or use the chat
              assistant to schedule time.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={`mailto:${config.owner.email}`}
                className="px-6 py-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Email Me
              </a>
              <a
                href={config.owner.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-colors"
              >
                LinkedIn
              </a>
              <a
                href={config.owner.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} {config.owner.name}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <a href="/privacy" className="hover:text-slate-400 transition-colors">
              Privacy policy
            </a>
            <span>·</span>
            <span>
              Built with{' '}
              <a
                href="https://github.com/creativecloudnative/folio-ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Logo className="text-xs hover:opacity-80 transition-opacity inline" />
              </a>{' '}
              — open source template
            </span>
          </div>
        </div>
      </footer>

      <ChatButton />
    </>
  )
}
