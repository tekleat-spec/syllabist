import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Plus, ChevronDown, ChevronRight, Maximize2, Minimize2, X, Calendar } from 'lucide-react';
import { format, isPast, differenceInCalendarDays } from 'date-fns';
import AddMaterialDialog from './AddMaterialDialog';
import WorkshopOutputPanel from './WorkshopOutputPanel';
import MaterialInsightCard from './MaterialInsightCard';

export default function AssignmentFolder({ courseId, assignmentName, dueDate }) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [items, setItems] = useState([]);
  const [output, setOutput] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

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
    load();
  };

  const innerContent = (
    <div className={`grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border ${fullscreen ? 'flex-1 min-h-0' : ''}`}>
      {/* Left: Materials */}
      <div className={`p-4 flex flex-col gap-3 ${fullscreen ? 'overflow-y-auto' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Materials</span>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
        <div className={fullscreen ? 'space-y-2' : ''}>
          {fullscreen ? (
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No materials yet. Add instructions + study files.</p>
              )}
              {items.map(item => (
                <MaterialInsightCard key={item.id} item={item} onDelete={deleteItem} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No materials yet. Add instructions + study files.</p>
              )}
              {items.map(item => (
                <MaterialInsightCard key={item.id} item={item} onDelete={deleteItem} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Output */}
      <div className={`p-4 flex flex-col ${fullscreen ? 'overflow-y-auto' : 'min-h-[320px]'}`}>
        <WorkshopOutputPanel
          courseId={courseId}
          assignmentName={assignmentName}
          items={items}
          output={output}
          onOutputSaved={load}
        />
      </div>
    </div>
  );

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Fullscreen header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/40 flex-shrink-0">
            <span className="font-semibold text-sm flex-1">{assignmentName}</span>
            {dueDate && <DueBadge dueDate={dueDate} />}
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
            <button onClick={() => setFullscreen(false)} className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={() => { setFullscreen(false); setOpen(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            <div className="p-4 flex flex-col gap-3 overflow-y-auto">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Materials</span>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No materials yet. Add instructions + study files.</p>
                )}
                {items.map(item => (
                  <MaterialInsightCard key={item.id} item={item} onDelete={deleteItem} />
                ))}
              </div>
            </div>
            <div className="p-4 flex flex-col overflow-y-auto">
              <WorkshopOutputPanel
                courseId={courseId}
                assignmentName={assignmentName}
                items={items}
                output={output}
                onOutputSaved={load}
              />
            </div>
          </div>
        </div>

        <AddMaterialDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          courseId={courseId}
          assignmentName={assignmentName}
          onAdded={load}
        />
      </>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Folder header — dropdown toggle */}
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="font-medium text-sm flex-1">{assignmentName}</span>
        {dueDate && <DueBadge dueDate={dueDate} />}
        <Badge variant="outline" className="text-xs">{items.length > 0 ? `${items.length} files` : 'empty'}</Badge>
        {open && (
          <button
            onClick={e => { e.stopPropagation(); setFullscreen(true); }}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && innerContent}

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

function DueBadge({ dueDate }) {
  const date = new Date(dueDate);
  const past = isPast(date);
  const days = differenceInCalendarDays(date, new Date());
  const colorClass = past
    ? 'text-destructive border-destructive/40 bg-destructive/5'
    : days <= 3
      ? 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800'
      : 'text-muted-foreground';
  return (
    <Badge variant="outline" className={`text-xs ${colorClass}`}>
      <Calendar className="w-3 h-3 mr-1" />
      {past ? 'Overdue · ' : 'Due '}{format(date, 'MMM d')}
    </Badge>
  );
}