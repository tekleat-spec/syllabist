import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Paperclip, X, FlaskConical, BookOpen, Scale, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TutorMessage from '@/components/tutor/TutorMessage';

const CITATION_STYLES = [
  { id: 'MLA', label: 'MLA', icon: BookOpen, description: 'Humanities' },
  { id: 'APA', label: 'APA', icon: GraduationCap, description: 'Social Sciences' },
  { id: 'BlueBook', label: 'BlueBook', icon: Scale, description: 'Legal' },
];

const WELCOME = {
  role: 'assistant',
  content: `🔬 **Research Assistant** — I conduct deep, source-backed research and produce detailed findings with proper citations.

**How to use:**
- Type a research prompt, question, or paste assignment instructions
- Optionally attach a document (syllabus, rubric, prompt PDF) for context
- Select your citation style (MLA, APA, or BlueBook)
- I'll search reputable sources, synthesize findings, and format citations correctly

I'll ask for clarification whenever your prompt needs more direction before I begin researching.`,
};

const SUGGESTED = [
  'Research the causes and long-term effects of the 2008 financial crisis',
  'Find peer-reviewed sources on climate change and agricultural yield',
  'Analyze landmark Supreme Court cases on Fourth Amendment rights',
  'Research the psychological impact of social media on adolescents',
];

export default function Research() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [citationStyle, setCitationStyle] = useState('MLA');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
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

  const buildMaterialsContext = () => {
    const parts = [];
    if (documents.length > 0) {
      parts.push('## Student Uploaded Documents');
      documents.forEach(d => {
        const course = courses.find(c => c.id === d.course_id);
        parts.push(`### "${d.title}" [${course?.name || 'Unknown Course'}]`);
        if (d.content_summary) parts.push(d.content_summary);
        if (d.generated_content) parts.push(d.generated_content);
      });
    }
    if (workshopItems.length > 0) {
      parts.push('## Workshop Materials');
      workshopItems.forEach(w => {
        const course = courses.find(c => c.id === w.course_id);
        parts.push(`### "${w.title}" [${course?.name || 'Unknown'}] — ${w.assignment_name}`);
        if (w.summary) parts.push(w.summary);
        if (w.key_info) parts.push(w.key_info);
        if (w.extracted_text) parts.push(w.extracted_text);
      });
    }
    return parts.join('\n\n');
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;

    const userMsg = { role: 'user', content: text, attachments: [...attachments] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    const materialsCtx = buildMaterialsContext();
    const history = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'User' : 'ResearchAI'}: ${m.content}`)
      .join('\n\n');

    const fileUrls = userMsg.attachments?.map(a => a.url) || [];

    const systemPrompt = `You are an expert academic research assistant embedded in StudyBuddy. Your job is to conduct rigorous, source-grounded research and produce detailed, well-organized findings.

CITATION STYLE: ${citationStyle}
${citationStyle === 'MLA' ? 'Format all citations in MLA 9th edition. Use in-text parenthetical citations (Author Page) and a Works Cited list at the end.' : ''}
${citationStyle === 'APA' ? 'Format all citations in APA 7th edition. Use in-text (Author, Year) citations and a References list at the end.' : ''}
${citationStyle === 'BlueBook' ? 'Format all citations using BlueBook 21st edition standards. Use proper legal citation format including court, year, reporter, and page.' : ''}

${materialsCtx ? `## Student's Uploaded Course Materials (use as assignment context):\n${materialsCtx}` : ''}

RESEARCH GUIDELINES:
1. **Clarification first**: If the prompt is vague, ambiguous, or missing key scope (topic, time period, jurisdiction, discipline), ask 1-3 specific clarifying questions BEFORE researching. Do not guess.
2. **Source quality**: Use only reputable sources — peer-reviewed journals, government publications, established news organizations, authoritative textbooks, or landmark legal cases. Never fabricate sources.
3. **Depth**: Provide detailed findings organized with clear headers and subheadings. Cover multiple perspectives where relevant.
4. **Citations**: Every factual claim must have an inline citation. End with a complete bibliography/works cited/references section in the chosen format.
5. **Academic tone**: Write in formal, academic prose appropriate for the citation style selected.
6. **Synthesis**: Don't just list facts — analyze, compare, and synthesize the research into coherent findings.

Conversation so far:
${history}

User: ${text}

ResearchAI:`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: systemPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      ...(fileUrls.length > 0 && { file_urls: fileUrls }),
    });

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: typeof result === 'string' ? result : result?.response || 'Sorry, I had trouble generating research. Please try again.',
    }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canSend = (input.trim() || attachments.length > 0) && !loading && !uploading;
  const showSuggestions = messages.length === 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <FlaskConical className="w-4 h-4 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground">Research Assistant</h1>
          <p className="text-xs text-muted-foreground">Source-grounded research with accurate citations · powered by live web search</p>
        </div>

        {/* Citation Style Selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {CITATION_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setCitationStyle(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                citationStyle === s.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <s.icon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>
        <Badge variant="secondary" className="text-xs hidden sm:flex">
          {citationStyle} · Live Search
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <TutorMessage key={i} message={msg} />
        ))}

        {showSuggestions && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {SUGGESTED.map(p => (
              <button
                key={p}
                onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors leading-relaxed"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <FlaskConical className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="flex gap-1 items-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Researching sources…</span>
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
                  : <Paperclip className="w-3 h-3 text-muted-foreground" />}
                <span className="max-w-[100px] truncate">{a.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-foreground ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
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
            placeholder="Enter a research topic, question, or paste assignment instructions…"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground max-h-40"
            style={{ height: 'auto', minHeight: '24px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!canSend}
            className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent hover:bg-accent/90"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Attach assignment rubrics or prompts for context · Citations in <strong>{citationStyle}</strong> format
        </p>
      </div>
    </div>
  );
}