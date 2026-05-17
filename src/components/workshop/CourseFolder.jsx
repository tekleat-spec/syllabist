import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AssignmentFolder from './AssignmentFolder';

export default function CourseFolder({ course, assignments }) {
  const [open, setOpen] = useState(false);
  const [assignmentFolders, setAssignmentFolders] = useState(
    assignments.map(a => a.title)
  );
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const addFolder = () => {
    if (!newName.trim()) return;
    if (!assignmentFolders.includes(newName.trim())) {
      setAssignmentFolders(prev => [...prev, newName.trim()]);
    }
    setNewName('');
    setAdding(false);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Course header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-muted/40 transition-colors text-left"
      >
        {open
          ? <FolderOpen className="w-5 h-5 text-primary" />
          : <Folder className="w-5 h-5 text-muted-foreground" />
        }
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{course.name}</p>
          {course.code && <p className="text-xs text-muted-foreground">{course.code}</p>}
        </div>
        <span className="text-xs text-muted-foreground mr-2">{assignmentFolders.length} assignments</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-3 bg-muted/20 space-y-3">
          {assignmentFolders.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-4">No assignment folders yet.</p>
          )}

          {assignmentFolders.map(name => (
            <AssignmentFolder key={name} courseId={course.id} assignmentName={name} />
          ))}

          {adding ? (
            <div className="flex gap-2 mt-2">
              <Input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Assignment name…"
                onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setAdding(false); }}
                className="flex-1"
              />
              <Button size="sm" onClick={addFolder}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => setAdding(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New Assignment Folder
            </Button>
          )}
        </div>
      )}
    </div>
  );
}