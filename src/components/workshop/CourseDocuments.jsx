import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Eye, Download, Sparkles, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const typeIcons = {
  syllabus: '📋', slides: '📊', notes: '📝', pdf: '📄', study_guide: '📚',
  paper_draft: '✍️', announcement: '📢', other: '📎',
};

export default function CourseDocuments({ documents }) {
  const [open, setOpen] = useState(false);

  if (!documents || documents.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <FileText className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm flex-1">Documents</span>
        <Badge variant="secondary" className="text-[10px]">{documents.length}</Badge>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-1.5">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <span className="text-base flex-shrink-0">{typeIcons[doc.type] || typeIcons.other}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[9px] capitalize">{doc.type?.replace(/_/g, ' ')}</Badge>
                  {doc.generation_type && doc.generation_type !== 'none' && (
                    <Badge className="text-[9px] capitalize bg-primary/10 text-primary border-0">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      {doc.generation_type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.file_url && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      title="View"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = doc.file_url;
                        a.download = doc.title || '';
                        a.target = '_blank';
                        a.click();
                      }}
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}