import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { motion } from 'framer-motion';

const eventTypeColors = {
  deadline: 'bg-destructive/80',
  exam: 'bg-amber-500',
  class: 'bg-primary',
  study_session: 'bg-emerald-500',
  office_hours: 'bg-cyan-500',
  reminder: 'bg-purple-500',
  other: 'bg-muted-foreground',
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();

  const toggleAssignmentDone = async (assignmentId, currentStatus) => {
    const newStatus = currentStatus === 'submitted' ? 'upcoming' : 'submitted';
    await base44.entities.Assignment.update(assignmentId, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
  };

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list('-due_date'),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  // Merge assignments as events, deduplicating by title+date against existing CalendarEvents
  const allEvents = useMemo(() => {
    const eventKeys = new Set(
      events.map(e => `${e.title?.toLowerCase().trim()}|${e.start_date?.slice(0, 10)}`)
    );
    const assignmentEvents = assignments
      .filter(a => {
        if (!a.due_date) return false;
        const key = `${a.title?.toLowerCase().trim()}|${a.due_date?.slice(0, 10)}`;
        return !eventKeys.has(key);
      })
      .map(a => ({
        id: `a-${a.id}`,
        assignmentId: a.id,
        title: a.title,
        start_date: a.due_date,
        event_type: a.type === 'exam' ? 'exam' : 'deadline',
        course_id: a.course_id,
        status: a.status,
        isAssignment: true,
      }));
    return [...events, ...assignmentEvents];
  }, [events, assignments]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Parse date strings safely — "YYYY-MM-DD" must be treated as local time, not UTC
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // If it's a date-only string (no time), parse as local to avoid UTC offset shifting the day
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  };

  const getEventsForDay = (day) => allEvents.filter(e => {
    const d = parseDate(e.start_date);
    return d && isSameDay(d, day);
  });

  const [selectedDay, setSelectedDay] = useState(null);
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Track deadlines, exams, and events" />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 text-left bg-card transition-colors hover:bg-muted/50 ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  } ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => {
                      const done = e.status === 'submitted' || e.status === 'graded';
                      return (
                        <div key={e.id} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? 'bg-emerald-500' : (eventTypeColors[e.event_type] || eventTypeColors.other)}`} />
                          <span className={`text-[10px] truncate leading-tight ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{e.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Day Detail Sidebar */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">
            {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Select a day'}
          </h3>
          {selectedDay && selectedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">No events on this day.</p>
          )}
          <div className="space-y-3">
            {selectedEvents.map((e) => {
              const course = courses.find(c => c.id === e.course_id);
              const done = e.status === 'submitted' || e.status === 'graded';
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border transition-colors ${done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/50 border-border'}`}
                >
                  <div className="flex items-start gap-2">
                    {e.isAssignment ? (
                      <button
                        onClick={() => toggleAssignmentDone(e.assignmentId, e.status)}
                        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
                      >
                        {done
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <Circle className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${eventTypeColors[e.event_type] || eventTypeColors.other}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {e.title}
                      </span>
                      {course && <p className="text-xs text-muted-foreground mt-0.5">{course.name}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {e.event_type?.replace(/_/g, ' ')}
                        </Badge>
                        {done && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
                            ✓ Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}