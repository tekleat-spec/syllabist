import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, isFuture, differenceInDays } from 'date-fns';
import TutorMessage from '@/components/tutor/TutorMessage';

const WELCOME = {
  role: 'assistant',
  content: `👋 Hi! I'm Syllabist, your AI study tutor. I have full context of your courses, assignments, documents, and grades.

Ask me anything — help with assignments, explain concepts, quiz you on material, summarize documents, check upcoming deadlines, or anything else you need to study smarter.`,
};

function buildContext({ courses, assignments, documents, workshopItems }) {
  const lines = [];

  if (courses.length > 0) {
    lines.push('## Enrolled Courses');
    courses.forEach(c => {
      lines.push(`- **${c.name}** (${c.code || 'no code'}) — Prof: ${c.professor || 'unknown'}, Semester: ${c.semester || 'unknown'}`);
    });
  }

  const upcoming = assignments
    .filter(a => a.due_date && isFuture(new Date(a.due_date)) && a.status !== 'submitted' && a.status !== 'graded')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  if (upcoming.length > 0) {
    lines.push('\n## Upcoming Assignments / Deadlines');
    upcoming.forEach(a => {
      const course = courses.find(c => c.id === a.course_id);
      const days = differenceInDays(new Date(a.due_date), new Date());
      lines.push(`- **${a.title}** [${course?.name || 'Unknown'}] — Due: ${format(new Date(a.due_date), 'MMM d, yyyy')} (${days} days) — Status: ${a.status} — Type: ${a.type || 'unknown'}${a.description ? ` — Description: ${a.description}` : ''}`);
    });
  }

  const graded = assignments.filter(a => a.grade != null);
  if (graded.length > 0) {
    lines.push('\n## Grades');
    graded.forEach(a => {
      const course = courses.find(c => c.id === a.course_id);
      lines.push(`- **${a.title}** [${course?.name || 'Unknown'}] — Grade: ${a.grade}${a.max_points ? `/${a.max_points}` : ''}`);
    });
  }

  if (documents.length > 0) {
    lines.push('\n## Uploaded Documents (Full Content)');
    documents.forEach(d => {
      const course = courses.find(c => c.id === d.course_id);
      lines.push(`\n### Document: "${d.title}" [${course?.name || 'Unknown Course'}] (${d.type || 'doc'})`);
      if (d.content_summary) lines.push(`**Summary:**\n${d.content_summary}`);
      if (d.generated_content) lines.push(`**Generated Content (${d.generation_type || 'ai'}):**\n${d.generated_content}`);
    });
  }

  if (workshopItems.length > 0) {
    lines.push('\n## Workshop Study Materials (Full Content)');
    workshopItems.forEach(w => {
      const course = courses.find(c => c.id === w.course_id);
      lines.push(`\n### Material: "${w.title}" [${course?.name || 'Unknown Course'}] — Assignment: ${w.assignment_name} (${w.item_type})`);
      if (w.summary) lines.push(`**Summary:**\n${w.summary}`);
      if (w.key_info) lines.push(`**Key Information:**\n${w.key_info}`);
      if (w.outline) lines.push(`**Outline:**\n${w.outline}`);
      if (w.extracted_text) lines.push(`**Full Text:**\n${w.extracted_text}`);
    });
  }

  return lines.join('\n');
}

export default function AiTutor() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: () => base44.entities.Assignment.list() });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => base44.entities.Document.list() });
  const { data: workshopItems = [] } = useQuery({ queryKey: ['workshopItems'], queryFn: () => base44.entities.WorkshopItem.list() });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isImage = file.type.startsWith('image/');
      setAttachments(prev => [...prev, { name: file.name, url: file_url, isImage }]);
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;

    const userMsg = { role: 'user', content: text, attachments: [...attachments] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    const context = buildContext({ courses, assignments, documents, workshopItems });

    const systemPrompt = `You are Syllabist, a knowledgeable and encouraging AI tutor. You have been given the student's FULL academic materials — treat them exactly as you would treat a document you can read, comprehend, and reason over.

${context ? `Here is the student's complete academic context, including full document content:\n\n${context}` : 'The student has no courses or assignments loaded yet.'}

Guidelines:
- You have the FULL content of every uploaded document and workshop material above. Read and use it deeply.
- When asked to explain a concept, pull the actual explanation from the materials and elaborate on it.
- When asked to write, draft, or create something (essay, code, answers, notes), use the materials as your source — just like a student who has read them.
- When asked to quiz the student, generate questions directly from the actual content above.
- When asked to summarize, produce a thorough summary based on the real content, not generic text.
- Use markdown formatting (bold, lists, headers, code blocks) where helpful.
- Always cite which document or material your answer comes from.
- Be encouraging and supportive.
- If you don't have enough data in the provided context to answer accurately, say so clearly.`;

    const history = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    history.push({ role: 'user', content: text });

    const fileUrls = userMsg.attachments?.map(a => a.url) || [];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n---\nConversation so far:\n${history.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n\n')}\n\nTutor:`,
      ...(fileUrls.length > 0 && { file_urls: fileUrls }),
    });

    setMessages(prev => [...prev, { role: 'assistant', content: typeof result === 'string' ? result : result?.response || 'Sorry, I had trouble responding.' }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = (input.trim() || attachments.length > 0) && !loading && !uploading;

  const suggestedPrompts = [
    "What assignments are due soon?",
    "Quiz me on my most recent study material",
    "Summarize my grades so far",
    "Help me make a study plan for this week",
  ];

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-gradient-to-b from-amber-50 via-orange-50/30 to-background dark:from-amber-950/20 dark:via-background dark:to-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-amber-100 dark:border-border/60 flex-shrink-0 bg-amber-50/80 dark:bg-card/60 backdrop-blur">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-300/50">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-foreground text-lg">Syllabist ✨</h1>
          <p className="text-xs text-muted-foreground">{courses.length} courses · {assignments.length} assignments · {documents.length} documents loaded</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <TutorMessage key={i} message={msg} />
        ))}

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-4">
            {suggestedPrompts.map(p => (
              <button
                key={p}
                onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                className="text-xs px-4 py-2 rounded-full border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium transition-all hover:shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 dark:text-amber-400"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex gap-1 items-center bg-white dark:bg-card border border-border/60 rounded-2xl px-4 py-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay:'0ms'}} />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay:'150ms'}} />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay:'300ms'}} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((a, i) => (
              <div key={i} className="relative flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1 text-xs text-foreground">
                {a.isImage
                  ? <img src={a.url} alt={a.name} className="h-8 w-8 rounded object-cover" />
                  : <Paperclip className="w-3 h-3 text-muted-foreground" />
                }
                <span className="max-w-[100px] truncate">{a.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-foreground ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-white dark:bg-card border border-border/80 rounded-2xl px-4 py-3 shadow-md shadow-black/5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.pptx,.xlsx,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your tutor anything…"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground max-h-40"
            style={{ height: 'auto', minHeight: '24px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!canSend}
            className="flex-shrink-0 h-8 w-8 rounded-lg"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Press Enter to send · Shift+Enter for new line · 📎 attach files</p>
      </div>
    </div>
  );
}