'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Copy, Check } from 'lucide-react'

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-[18px] border border-border bg-[rgba(255,255,255,0.74)]">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-text-muted-high">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 transition-colors duration-150 hover:text-text-primary"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-white/40 p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed text-text-primary">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-sm text-text-primary">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="mb-2 mt-4 font-[family-name:var(--font-display)] text-lg tracking-[-0.03em] text-text-primary">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-1.5 mt-3 font-[family-name:var(--font-display)] text-base tracking-[-0.02em] text-text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-3 font-semibold text-text-primary">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ className, children, ...props }) => {
            if (className) {
              return <CodeBlock className={className}>{children}</CodeBlock>
            }
            const isWithinPre = false
            if (isWithinPre) return <code {...props}>{children}</code>
            return (
              <code className="rounded-radius-sm border border-border bg-white/60 px-1 py-0.5 text-xs font-[family-name:var(--font-mono)] text-text-primary">
                {children}
              </code>
            )
          },
          pre: ({ children }) => {
            return <>{children}</>
          },
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-accent pl-3 text-text-secondary italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-dark hover:text-accent-hover underline"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
