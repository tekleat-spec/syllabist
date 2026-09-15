import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownContent({ content = '', className = '' }) {
  return (
    <div className={`text-sm leading-relaxed text-foreground space-y-4 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight mt-6 mb-3 pb-2 border-b border-border">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight mt-5 mb-2 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-4 mb-1.5 text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-1">{children}</h4>
          ),
          p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90">{children}</p>,
          ul: ({ children }) => <ul className="space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1.5 list-decimal list-inside marker:text-primary marker:font-semibold">{children}</ol>,
          li: ({ children }) => (
            <li className="text-sm leading-relaxed text-foreground/90 flex gap-2 items-start">
              <span className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full bg-primary/70" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground bg-primary/10 px-1 rounded">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-4 py-1 my-2 bg-muted/40 rounded-r-md text-foreground/80 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-5" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium">
              {children}
            </a>
          ),
          code: ({ inline, children, ...props }) =>
            inline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono text-primary font-medium" {...props}>{children}</code>
            ) : (
              <code className="block bg-muted/60 rounded-lg p-4 text-[12px] font-mono overflow-x-auto border border-border" {...props}>{children}</code>
            ),
          pre: ({ children }) => <pre className="bg-transparent p-0 m-0">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-border my-3">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          th: ({ children }) => <th className="text-left font-semibold px-3 py-2 border-b border-border text-foreground">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 border-t border-border text-foreground/90">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}