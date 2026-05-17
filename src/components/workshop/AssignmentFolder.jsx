import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, Link2, Video, BookOpen, File, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import AddMaterialDialog from './AddMaterialDialog';
import WorkshopOutputPanel from './WorkshopOutputPanel';

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

export default function AssignmentFolder({ courseId, assignmentName }) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [items, setItems] = useState([]);
  const [output, setOutput] = useState(null);

  const load = async () => {
    const [its, outs] = await Promise.all([
      base44.entities.WorkshopItem.filter({ course_id: courseId, assignment_name: assignmentName }),
      base44.entities.WorkshopOutput.filter({ course_id: courseId, assignment_name: assignmentName }),
    ]);
    setItems(its);
    setOutput(outs[0] || null);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const deleteItem = async (id) => {
    await base44.entities.WorkshopItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Folder header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="font-medium text-sm flex-1">{assignmentName}</span>
        <Badge variant="outline" className="text-xs">{items.length > 0 ? `${items.length} files` : 'empty'}</Badge>
      </button>

      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left: Materials */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Materials</span>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No materials yet. Add instructions + study files.</p>
                )}
                {items.map(item => {
                  const Icon = typeIcon[item.item_type] || File;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 bg-card border border-border rounded-lg group">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <Badge className={`text-xs mt-0.5 ${typeColor[item.item_type]}`}>{item.item_type}</Badge>
                      </div>
                      {(item.file_url || item.source_url) && (
                        <a
                          href={item.file_url || item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          View
                        </a>
                      )}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right: AI Output */}
          <div className="p-4 flex flex-col min-h-[320px]">
            <WorkshopOutputPanel
              courseId={courseId}
              assignmentName={assignmentName}
              items={items}
              output={output}
              onOutputSaved={load}
            />
          </div>
        </div>
      )}

      <AddMaterialDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        courseId={courseId}
        assignmentName={assignmentName}
        onAdded={load}
      />
    </div>
  );
}