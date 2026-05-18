import ReactMarkdown from 'react-markdown';
import { Sparkles, User, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TutorMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div className={cn('max-w-[80%] flex flex-col gap-2')}>
        {/* Attachments */}
        {isUser && message.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {message.attachments.map((a, i) => (
              a.isImage
                ? <img key={i} src={a.url} alt={a.name} className="max-h-48 max-w-xs rounded-xl object-cover border border-border" />
                : <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1 text-xs text-foreground">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="max-w-[160px] truncate">{a.name}</span>
                  </div>
            ))}
          </div>
        )}
        <div className={cn('rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border rounded-bl-sm text-foreground',
          isUser && !message.content && 'hidden'
        )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ inline, children }) =>
                inline
                  ? <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{children}</code>
                  : <pre className="bg-muted rounded-lg p-3 overflow-x-auto my-2"><code className="text-xs font-mono">{children}</code></pre>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}