import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Link2, Video, BookOpen, File, Trash2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';

const typeIcon = {
  instructions: FileText,
  pdf: BookOpen,
  slides: FileText,
  url: Link2,
  video_url: Video,
  other: File,
};

const typeColor = {
  instructions: 'bg-purple-100 text-purple-800',
  pdf: 'bg-blue-100 text-blue-800',
  slides: 'bg-orange-100 text-orange-800',
  url: 'bg-green-100 text-green-800',
  video_url: 'bg-red-100 text-red-800',
  other: 'bg-muted text-muted-foreground',
};

export default function MaterialInsightCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcon[item.item_type] || File;
  const isProcessing = item.status === 'processing';
  const isReady = item.status === 'ready';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors group"
        onClick={() => isReady && setExpanded(e => !e)}
      >
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge className={`text-xs ${typeColor[item.item_type]}`}>{item.item_type}</Badge>
            {isProcessing && <Badge className="text-xs bg-yellow-100 text-yellow-800 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</Badge>}
            {isReady && <Badge className="text-xs bg-green-100 text-green-800">Analyzed</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {(item.file_url || item.source_url) && (
            <a href={item.file_url || item.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
            </a>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Expandable insight panel */}
      {expanded && isReady && (
        <div className="border-t border-border p-3 bg-muted/10">
          <Tabs defaultValue="summary">
            <TabsList className="h-7 text-xs mb-3">
              <TabsTrigger value="summary" className="text-xs px-3 h-6">Summary</TabsTrigger>
              <TabsTrigger value="key_info" className="text-xs px-3 h-6">Key Info</TabsTrigger>
              <TabsTrigger value="outline" className="text-xs px-3 h-6">Outline</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <div className="prose prose-xs max-w-none text-xs">
                <ReactMarkdown>{item.summary || '_No summary available._'}</ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="key_info">
              <div className="prose prose-xs max-w-none text-xs">
                <ReactMarkdown>{item.key_info || '_No key info available._'}</ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="outline">
              <div className="prose prose-xs max-w-none text-xs">
                <ReactMarkdown>{item.outline || '_No outline available._'}</ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}