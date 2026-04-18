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
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-espresso/5 border border-border rounded-radius-md px-3 py-1 text-[10px] text-text-muted-high font-mono">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-text-muted-high hover:text-text-primary transition-colors duration-150"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
      <pre className="bg-latte border border-border rounded-b-radius-md p-3 overflow-x-auto font-[family-name:var(--font-mono)] text-xs leading-relaxed text-espresso">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-coffee text-sm">
      <ReactMarkdown
        components={{
          // Paragraphs
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          // Bold
          strong: ({ children }) => <strong className="font-semibold text-espresso">{children}</strong>,
          // Italic
          em: ({ children }) => <em className="italic">{children}</em>,
          // Headers
          h1: ({ children }) => <h1 className="font-[family-name:var(--font-display)] text-lg text-espresso mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="font-[family-name:var(--font-display)] text-base text-espresso mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="font-semibold text-espresso mt-3 mb-1">{children}</h3>,
          // Lists
          ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Inline code
          code: ({ className, children, ...props }) => {
            // If it has a className it's a code block (from a fenced code block)
            if (className) {
              return <CodeBlock className={className}>{children}</CodeBlock>
            }
            // Inline code
            const isWithinPre = false // react-markdown places inline code directly
            if (isWithinPre) return <code {...props}>{children}</code>
            return (
              <code className="bg-latte text-espresso px-1 py-0.5 rounded-radius-sm text-xs font-[family-name:var(--font-mono)]">
                {children}
              </code>
            )
          },
          // Pre blocks — override to use our CodeBlock for fenced code
          pre: ({ children }) => {
            // react-markdown wraps fenced code blocks in <pre><code className="language-...">
            // We handle styling in the code component above, so we just pass through
            return <>{children}</>
          },
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent pl-3 my-2 text-text-secondary italic">
              {children}
            </blockquote>
          ),
          // Links
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
          // Horizontal rule
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}