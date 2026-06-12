import { addDays, format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const DAY_COLORS = [
  'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
  'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30',
  'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
  'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
  'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30',
  'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40',
  'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40',
];

const DOT_COLORS = [
  'bg-blue-400', 'bg-violet-400', 'bg-emerald-400',
  'bg-amber-400', 'bg-rose-400', 'bg-slate-400', 'bg-slate-400',
];

// Parse emoji + course name from task string like "🎯 [CS101] Do the thing (1 hr)"
function parseTask(raw) {
  const timeMatch = raw.match(/\((\d[\d.]*\s*hrs?)\)\s*$/i);
  const time = timeMatch ? timeMatch[1] : null;
  const text = raw.replace(/\(\d[\d.]*\s*hrs?\)\s*$/i, '').trim();
  return { text, time };
}

export default function WeeklyGrid({ days, weekStart }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {days.map((day, i) => {
        const date = addDays(weekStart, i);
        const isCurrentDay = isToday(date);
        const isEmpty = !day.tasks || day.tasks.length === 0;

        return (
          <div
            key={day.name}
            className={cn(
              'rounded-2xl border-2 p-4 flex flex-col gap-2 transition-shadow',
              DAY_COLORS[i % DAY_COLORS.length],
              isCurrentDay && 'ring-2 ring-primary ring-offset-2',
            )}
          >
            {/* Day header */}
            <div className="flex items-start justify-between">
              <div>
                <p className={cn('text-xs font-bold uppercase tracking-wider', isCurrentDay ? 'text-primary' : 'text-muted-foreground')}>
                  {day.name}
                </p>
                <p className="text-sm font-semibold text-foreground">{format(date, 'MMM d')}</p>
              </div>
              {day.total && (
                <span className="text-xs bg-white/70 dark:bg-black/20 border border-border rounded-full px-2 py-0.5 font-medium text-foreground">
                  {day.total}
                </span>
              )}
            </div>

            {/* Tasks */}
            {isEmpty ? (
              <p className="text-xs text-muted-foreground italic mt-1">Rest day 🌿</p>
            ) : (
              <ul className="space-y-2 mt-1">
                {day.tasks.map((raw, j) => {
                  const { text, time } = parseTask(raw);
                  return (
                    <li key={j} className="flex items-start gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', DOT_COLORS[i % DOT_COLORS.length])} />
                      <span className="text-xs text-foreground leading-snug flex-1">{text}</span>
                      {time && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{time}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}