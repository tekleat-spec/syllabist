import { useState } from 'react';
import { BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const DAY_NAMES = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const DAY_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-700',
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-sky-50 border-sky-200 text-sky-700',
  'bg-orange-50 border-orange-200 text-orange-700',
];

const DOT_COLORS = [
  'bg-blue-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-sky-400',
  'bg-orange-400',
];

function parseSchedule(markdown) {
  const lines = markdown.split('\n');
  const days = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headerMatch =
      line.match(/^#{1,3}\s*\*{0,2}(.+?)\*{0,2}$/) ||
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

    if (current) {
      const bulletMatch = line.match(/^[-*•]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/);
      if (bulletMatch) {
        current.sessions.push(bulletMatch[1].trim());
      }
    }
  }

  return days;
}

function SessionPill({ text, dotColor }) {
  // Try to extract a time like "9:00 AM - 10:00 AM" from the session text
  const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i);
  const time = timeMatch?.[1]?.trim();
  const label = time ? text.replace(timeMatch[0], '').replace(/^[\s:\-–]+|[\s:\-–]+$/g, '') : text;

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-black/5 transition-colors group">
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="min-w-0">
        {time && <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{time}</p>}
        <p className="text-xs text-foreground leading-snug">{label || text}</p>
      </div>
    </div>
  );
}

function DayCard({ day, colorClass, dotColor, index }) {
  const [expanded, setExpanded] = useState(index < 3);
  const shortName = day.title.split(',')[0].split(' ')[0];

  return (
    <div className={`rounded-xl border ${colorClass} overflow-hidden flex flex-col`}>
      {/* Day header */}
      <button
        onClick={() => setExpanded(o => !o)}
        className="flex items-center justify-between px-3 py-2.5 w-full text-left"
      >
        <div>
          <p className="font-bold text-sm">{shortName}</p>
          {day.title.includes(',') && (
            <p className="text-[10px] opacity-70 font-medium">{day.title.split(',').slice(1).join(',').trim()}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium opacity-70">{day.sessions.length} task{day.sessions.length !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
        </div>
      </button>

      {/* Sessions */}
      {expanded && (
        <div className="bg-white/60 px-2 pb-2 space-y-0.5 flex-1">
          {day.sessions.length > 0
            ? day.sessions.map((s, i) => <SessionPill key={i} text={s} dotColor={dotColor} />)
            : <p className="text-xs text-muted-foreground italic px-2 py-1">Rest day 🎉</p>
          }
        </div>
      )}
    </div>
  );
}

export default function ScheduleCalendar({ markdown }) {
  const days = parseSchedule(markdown);
  if (days.length === 0) return null;

  const totalSessions = days.reduce((s, d) => s + d.sessions.length, 0);

  return (
    <div className="w-full">
      {/* Summary bar */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <BookOpen className="w-3.5 h-3.5" />
        <span>{days.length}-day plan · {totalSessions} study sessions</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {days.map((day, i) => (
          <DayCard
            key={i}
            day={day}
            index={i}
            colorClass={DAY_COLORS[i % DAY_COLORS.length]}
            dotColor={DOT_COLORS[i % DOT_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}