import React from 'react';
import { Bell, Clock } from 'lucide-react';
import { format, isFuture, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function ReminderWidget({ assignments = [], courses = [] }) {
  const upcoming = assignments
    .filter(a => a.due_date && isFuture(new Date(a.due_date)) && a.status !== 'submitted' && a.status !== 'graded')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const urgency = (days) => days <= 1 ? 'critical' : days <= 3 ? 'warning' : 'normal';
  const colorMap = {
    critical: 'text-destructive bg-destructive/10 border-destructive/20',
    warning: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800',
    normal: 'text-primary bg-primary/10 border-primary/20',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Bell className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground leading-tight">SyncMind</h3>
          <p className="text-[10px] text-muted-foreground">Upcoming reminders</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No upcoming reminders</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">You're all caught up</p>
          </div>
        ) : (
          upcoming.map((a, i) => {
            const days = differenceInDays(new Date(a.due_date), new Date());
            const course = courses.find(c => c.id === a.course_id);
            const u = urgency(days);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{course?.name || 'No course'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${colorMap[u]}`}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(a.due_date), 'EEE, MMM d')}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}