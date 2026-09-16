import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';

export default function RemoteMarkdown({ text, url }) {
  const [content, setContent] = useState(text || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (url) {
      setLoading(true);
      fetch(url)
        .then(r => r.text())
        .then(t => setContent(t || 'No content available.'))
        .catch(() => setContent('Failed to load content.'))
        .finally(() => setLoading(false));
    } else {
      setContent(text || '');
    }
  }, [url, text]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none pr-2">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}