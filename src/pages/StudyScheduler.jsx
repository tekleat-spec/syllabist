import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CalendarDays, Loader2, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format, addDays, startOfWeek, isFuture, differenceInDays, parseISO } from 'date-fns';
import WeeklyGrid from '@/components/scheduler/WeeklyGrid';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudyScheduler() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedule, setSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [googleSynced, setGoogleSynced] = useState(false);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: () => base44.entities.Assignment.list() });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => base44.entities.Document.list() });

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const generateSchedule = async () => {
    setGenerating(true);
    setSchedule(null);

    const upcoming = assignments
      .filter(a => a.due_date && isFuture(new Date(a.due_date)) && a.status !== 'submitted' && a.status !== 'graded')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return { name: DAYS[d.getDay()], date: format(d, 'EEE MMM d') };
    }).filter(d => !skipWeekends || (d.name !== 'Saturday' && d.name !== 'Sunday'));

    const assignmentList = upcoming.slice(0, 20).map(a => {
      const course = courses.find(c => c.id === a.course_id);
      const days = differenceInDays(new Date(a.due_date), weekStart);
      return `- "${a.title}" [${course?.name || 'Unknown'}] — Due: ${format(new Date(a.due_date), 'EEE MMM d')} (${days > 0 ? `in ${days} days` : 'past/this week'}) — Type: ${a.type || 'unknown'} — Status: ${a.status}${a.description ? ` — Notes: ${a.description}` : ''}`;
    }).join('\n');

    // Pull syllabus content summaries for richer context
    const syllabi = documents.filter(d => d.type === 'syllabus' && d.content_summary);
    const syllabusContext = syllabi.map(d => {
      const course = courses.find(c => c.id === d.course_id);
      return `### Syllabus: ${course?.name || d.title}\n${d.content_summary}`;
    }).join('\n\n');

    const otherDocs = documents.filter(d => d.type !== 'syllabus').slice(0, 12).map(d => {
      const course = courses.find(c => c.id === d.course_id);
      return `- "${d.title}" [${course?.name || 'Unknown'}] (${d.type})${d.content_summary ? ` — ${d.content_summary.slice(0, 120)}` : ''}`;
    }).join('\n');

    const prompt = `You are an expert academic coach. Create a detailed, realistic daily study schedule for the week of ${weekLabel}.

STUDENT CONSTRAINTS:
- Available study hours per day: ${hoursPerDay} hours
- Skip weekends: ${skipWeekends ? 'Yes' : 'No'}
- Week days to plan: ${weekDays.map(d => d.date).join(', ')}

UPCOMING ASSIGNMENTS (prioritize by urgency):
${assignmentList || 'No upcoming assignments found.'}

SYLLABUS CONTENT (use deadlines, topics, and course structure from these):
${syllabusContext || 'No syllabus content available. Use assignment data above.'}

OTHER STUDY MATERIALS:
${otherDocs || 'No other documents uploaded yet.'}

INSTRUCTIONS:
1. Use the syllabus content to identify key topics, exam dates, and reading schedules — not just the assignment list
2. Distribute study sessions logically, giving more time to urgent/high-weight assignments
3. Include specific tasks for each day (e.g. "Read Chapter 3 for PSYC101", "Draft intro paragraph for essay", "Review lecture notes before Thursday exam")
4. Reference actual assignment names and courses
5. Keep each day within the ${hoursPerDay}-hour limit
6. Add a review buffer before any deadlines that fall this week
7. Format EXACTLY like this — use this structure for every day:

## Monday, Jun 16
**Total: 2.5 hrs**
- 🎯 [Course Name] Task description here (1 hr)
- 📖 [Course Name] Another task (1.5 hrs)

## Tuesday, Jun 17
**Total: 3 hrs**
- etc.

8. End with a short "## Weekly Focus" section listing the top 3 priorities for the week.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    const scheduleText = typeof result === 'string' ? result : result?.response || '';
    setSchedule(scheduleText);
    setGenerating(false);
    setGoogleSynced(false);
    // Best-effort push of study sessions to Google Calendar
    try {
      const days = parseScheduleIntoDays(scheduleText, weekStart);
      const sessions = [];
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        if (!day.tasks || day.tasks.length === 0) continue;
        const date = addDays(weekStart, i);
        const start = new Date(date);
        start.setHours(16, 0, 0, 0);
        const totalMatch = (day.total || '').match(/([\d.]+)\s*hrs?/i);
        const durationHours = totalMatch ? parseFloat(totalMatch[1]) : 2;
        sessions.push({
          title: `Study Session — ${day.name}`,
          start: start.toISOString(),
          durationHours,
          description: day.tasks.join('\n'),
        });
      }
      if (sessions.length > 0) {
        await base44.functions.invoke('sync-to-google-calendar', { mode: 'study', sessions });
        setGoogleSynced(true);
      }
    } catch (e) {
      // User may not have Google Calendar connected — skip silently
    }
  };

  const parsedDays = schedule ? parseScheduleIntoDays(schedule, weekStart) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-xl text-foreground">Weekly Study Planner</h1>
          <p className="text-sm text-muted-foreground">AI-generated schedule based on your syllabus & deadlines</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Week nav */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(v => v - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[160px] text-center">{weekLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(v => v + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>Today's week</Button>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 flex-wrap sm:ml-auto">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Hours/day:</span>
              <select
                value={hoursPerDay}
                onChange={e => setHoursPerDay(Number(e.target.value))}
                className="text-sm bg-background border border-border rounded-md px-2 py-1 text-foreground"
              >
                {[1, 1.5, 2, 2.5, 3, 4, 5, 6].map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={e => setSkipWeekends(e.target.checked)}
                className="rounded"
              />
              Skip weekends
            </label>
          </div>

          <Button onClick={generateSchedule} disabled={generating} className="sm:ml-2">
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
              : schedule
                ? <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
                : <><Sparkles className="w-4 h-4 mr-2" />Generate Schedule</>
            }
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!schedule && !generating && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Ready to plan your week?</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Set your available hours above, then click Generate Schedule to get a personalized day-by-day plan based on your upcoming deadlines.
            </p>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {assignments.filter(a => a.due_date && isFuture(new Date(a.due_date))).length} upcoming assignments · {courses.length} courses · {documents.filter(d => d.type === 'syllabus').length} syllabi · {documents.length} documents loaded
          </div>
        </div>
      )}

      {/* Loading */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your assignments and building your schedule…</p>
        </div>
      )}

      {/* Schedule grid */}
      {schedule && !generating && (
        <>
          {googleSynced && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="w-4 h-4" />
              Study sessions pushed to your Google Calendar
            </div>
          )}
          <WeeklyGrid days={parsedDays} weekStart={weekStart} />
          <details className="mt-4 bg-card border border-border rounded-xl p-4">
            <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">Show full schedule text</summary>
            <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{schedule}</ReactMarkdown>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function parseScheduleIntoDays(markdown, weekStart) {
  const dayMap = {};
  const lines = markdown.split('\n');
  let currentDay = null;

  lines.forEach(line => {
    const dayMatch = line.match(/^##\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      currentDay = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase();
      dayMap[currentDay] = { name: currentDay, tasks: [], total: '' };
      return;
    }
    if (!currentDay) return;
    const totalMatch = line.match(/\*\*Total[:\s]+([\d.]+\s*hrs?)\*\*/i);
    if (totalMatch) { dayMap[currentDay].total = totalMatch[1]; return; }
    const taskMatch = line.match(/^[-*]\s+(.+)/);
    if (taskMatch) dayMap[currentDay].tasks.push(taskMatch[1]);
  });

  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const name = DAYS[d.getDay()];
    return dayMap[name] || { name, tasks: [], total: '' };
  });
}