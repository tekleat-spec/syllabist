import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TutorMessage from '@/components/tutor/TutorMessage';

const WELCOME = {
  role: 'assistant',
  content: `📚 Hi! I'm your Document Q&A assistant. I can answer questions using your uploaded course materials — notes, syllabi, slides, study guides, and more.

Ask me anything about your documents, request a summary, generate flashcards, or quiz yourself on the content!`,
};

const SUGGESTED = [
  "Summarize my most recent document",
  "What are the key concepts in my notes?",
  "Create flashcards from my study materials",
  "What does my syllabus say about grading?",
];

export default function DocumentQA() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initialize agent conversation
  useEffect(() => {
    base44.agents.createConversation({ agent_name: 'document_qa' }).then(conv => {
      setConversationId(conv.id);
    });
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      const agentMsgs = data.messages.filter(m => m.role !== 'system');
      if (agentMsgs.length > 0) {
        setMessages([WELCOME, ...agentMsgs]);
      }
    });
    return unsub;
  }, [conversationId]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !conversationId) return;
    setInput('');
    setLoading(true);

    // Optimistically show user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    await base44.agents.addMessage(
      { id: conversationId },
      { role: 'user', content: text }
    );

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-accent-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">Document Q&A</h1>
          <p className="text-xs text-muted-foreground">{documents.length} documents loaded · Ask anything about your materials</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <TutorMessage key={i} message={msg} />
        ))}

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTED.map(p => (
              <button
                key={p}
                onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="flex gap-1 items-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching your documents…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border">
        <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents…"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground max-h-40"
            style={{ height: 'auto', minHeight: '24px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!input.trim() || loading || !conversationId}
            className="flex-shrink-0 h-8 w-8 rounded-lg"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}