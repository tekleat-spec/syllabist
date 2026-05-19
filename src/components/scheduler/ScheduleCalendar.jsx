import { useState } from 'react';
import { BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const DAY_NAMES = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const DAY_COLORS = [
  { card: 'bg-blue-50 border-blue-200', header: 'bg-blue-100 text-blue-800', dot: 'bg-blue-400' },
  { card: 'bg-violet-50 border-violet-200', header: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400' },
  { card: 'bg-emerald-50 border-emerald-200', header: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-400' },
  { card: 'bg-amber-50 border-amber-200', header: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  { card: 'bg-rose-50 border-rose-200', header: 'bg-rose-100 text-rose-800', dot: 'bg-rose-400' },
  { card: 'bg-sky-50 border-sky-200', header: 'bg-sky-100 text-sky-800', dot: 'bg-sky-400' },
  { card: 'bg-orange-50 border-orange-200', header: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400' },
];

function cleanCell(text) {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

function parseSchedule(markdown) {
  const days = {};
  const dayOrder = [];

  // --- Strategy 1: Markdown table rows ---
  // Each row: | Day | Course | Tasks | ... |
  const tableRows = markdown.split('\n').filter(l => l.trim().startsWith('|'));
  
  for (const row of tableRows) {
    const cells = row.split('|').map(c => cleanCell(c)).filter(Boolean);
    if (cells.length < 2) continue;
    // Skip separator rows like |---|---|
    if (cells.every(c => /^[-:]+$/.test(c))) continue;
    // Skip header rows
    const firstCell = cells[0].toLowerCase();
    if (firstCell === 'day' || firstCell === 'date') continue;

    const isDay = DAY_NAMES.some(d => firstCell.includes(d));
    if (!isDay) continue;

    const dayLabel = cells[0];
    const sessionText = cells.slice(1).filter(Boolean).join(' · ');

    if (!days[dayLabel]) {
      days[dayLabel] = { title: dayLabel, sessions: [] };
      dayOrder.push(dayLabel);
    }
    if (sessionText) days[dayLabel].sessions.push(sessionText);
  }

  // --- Strategy 2: Bold/header day sections (## Monday or **Monday**) ---
  if (dayOrder.length === 0) {
    const lines = markdown.split('\n');
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
          days[title] = current;
          dayOrder.push(title);
          continue;
        }
      }

      if (current) {
        const bulletMatch = line.match(/^[-*•]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/);
        if (bulletMatch) current.sessions.push(bulletMatch[1].trim());
      }
    }
  }

  return dayOrder.map(k => days[k]);
}

function DayCard({ day, colors, index }) {
  const [expanded, setExpanded] = useState(true);
  // Short name: "Tuesday, May 19" → "Tue · May 19"
  const parts = day.title.split(',');
  const shortDay = parts[0].trim().slice(0, 3);
  const date = parts.slice(1).join(',').trim();

  return (
    <div className={`rounded-xl border ${colors.card} overflow-hidden flex flex-col`}>
      <button
        onClick={() => setExpanded(o => !o)}
        className={`flex items-center justify-between px-3 py-2.5 w-full text-left ${colors.header}`}
      >
        <div>
          <p className="font-bold text-sm">{shortDay}</p>
          {date && <p className="text-[10px] font-medium opacity-75">{date}</p>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium opacity-60">{day.sessions.length}</span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 opacity-60" />
            : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
        </div>
      </button>

      {expanded && (
        <div className="bg-white/70 px-2 py-2 space-y-1.5">
          {day.sessions.length > 0
            ? day.sessions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <p className="text-xs text-foreground leading-snug">{s}</p>
                </div>
              ))
            : <p className="text-xs text-muted-foreground italic px-1">Rest day 🎉</p>
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
    <div className="w-full mt-1">
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <BookOpen className="w-3.5 h-3.5" />
        <span>{days.length}-day plan · {totalSessions} study sessions</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {days.map((day, i) => (
          <DayCard
            key={i}
            day={day}
            index={i}
            colors={DAY_COLORS[i % DAY_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}