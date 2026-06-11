'use client'

import { useEffect, useRef, useState, useId } from 'react'

type Props = {
  code: string
}

export default function MermaidBlock({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const uid = useId().replace(/:/g, '')

  useEffect(() => {
    if (!containerRef.current) return
    setError(null)

    let cancelled = false

    import('mermaid').then((mod) => {
      if (cancelled) return
      const mermaid = mod.default

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#18181b',
          primaryColor: '#4f46e5',
          primaryTextColor: '#e4e4e7',
          primaryBorderColor: '#3f3f46',
          lineColor: '#71717a',
          secondaryColor: '#27272a',
          tertiaryColor: '#27272a',
          edgeLabelBackground: '#18181b',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '13px',
        },
        securityLevel: 'loose',
      })

      mermaid.render(`m-${uid}`, code.trim())
        .then(({ svg }) => {
          if (!cancelled && containerRef.current) {
            containerRef.current.innerHTML = svg
            // Make the SVG responsive
            const svgEl = containerRef.current.querySelector('svg')
            if (svgEl) {
              svgEl.style.maxWidth = '100%'
              svgEl.style.height = 'auto'
            }
          }
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message ?? 'Invalid diagram syntax')
        })
    })

    return () => { cancelled = true }
  }, [code, uid])

  if (error) {
    return (
      <div className="my-2 rounded-lg border border-red-800/50 bg-red-950/20 p-3">
        <p className="text-xs text-red-400 mb-2">Diagram syntax error — fix and regenerate:</p>
        <pre className="text-xs text-zinc-500 overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-3 flex justify-start overflow-x-auto rounded-lg bg-zinc-900/60 p-3 border border-zinc-700/50"
    />
  )
}
