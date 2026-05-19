import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Parses markdown schedule text into structured day objects.
 * Looks for lines like "## Monday" or "**Monday, May 19**" as day headers,
 * then collects bullet/list items underneath as sessions.
 */
function parseSchedule(markdown) {
  const lines = markdown.split('\n');
  const days = [];
  let current = null;

  const DAY_NAMES = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect day headers: ## Day or **Day** or ### Day, Day May 19, etc.
    const headerMatch = line.match(/^#{1,3}\s*\*{0,2}(.+?)\*{0,2}$/) ||
                        line.match(/^\*{2}(.+?)\*{2}$/) ||
                        line.match(/^__(.+?)__$/);

    if (headerMatch) {
      const title = headerMatch[1].trim();
      const isDay = DAY_NAMES.some(d => title.toLowerCase().includes(d));
      if (isDay) {
        current = { title, sessions: [] };
        days.push(current);
        continue;
      }
    }

    // Collect bullet items under current day
    if (current) {
      const bulletMatch = line.match(/^[-*•]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/);
      if (bulletMatch) {
        current.sessions.push(bulletMatch[1].trim());
      }
    }
  }

  return days;
}

function DayCard({ day, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <span className="font-semibold text-sm text-foreground">{day.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <ul className="px-4 py-3 space-y-2 bg-card">
          {day.sessions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <BookOpen className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span>{s}</span>
            </li>
          ))}
          {day.sessions.length === 0 && (
            <li className="text-xs text-muted-foreground italic">No sessions scheduled</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function ScheduleCalendar({ markdown }) {
  const days = parseSchedule(markdown);

  if (days.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Clock className="w-3.5 h-3.5" />
        <span>Click a day to expand your sessions</span>
      </div>
      {days.map((day, i) => (
        <DayCard key={i} day={day} defaultOpen={i === 0} />
      ))}
    </div>
  );
}