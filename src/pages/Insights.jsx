import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

function letterGrade(score) {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

function CourseCard({ course, assignments }) {
  const graded = assignments.filter(a => a.grade != null && a.max_points != null);
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const chartData = graded
    .sort((a, b) => new Date(a.due_date || a.created_date) - new Date(b.due_date || b.created_date))
    .map(a => ({
      name: a.title.length > 14 ? a.title.slice(0, 14) + '…' : a.title,
      pct: Math.round((a.grade / a.max_points) * 100),
    }));

  const avg = graded.length
    ? Math.round(graded.reduce((s, a) => s + (a.grade / a.max_points) * 100, 0) / graded.length)
    : null;

  const generateReport = async () => {
    setGenerating(true);
    setExpanded(true);
    const details = graded.map(a =>
      `- ${a.title} (${a.type || 'assignment'}): ${a.grade}/${a.max_points} = ${Math.round((a.grade/a.max_points)*100)}%${a.weight ? ` [weight: ${a.weight}%]` : ''}`
    ).join('\n');

    const upcoming = assignments
      .filter(a => a.grade == null && a.status !== 'submitted')
      .map(a => `- ${a.title} (${a.type || 'assignment'})${a.due_date ? `, due ${format(new Date(a.due_date), 'MMM d')}` : ''}`)
      .join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an academic advisor. Write a concise, encouraging performance summary report for a student in ${course.name}${course.code ? ` (${course.code})` : ''}.

Graded work:
${details || 'No graded work yet.'}

Upcoming/incomplete work:
${upcoming || 'None.'}

Overall average: ${avg != null ? avg + '%' : 'N/A'}

In your report:
1. Summarize overall performance with the letter grade equivalent
2. Identify strongest and weakest assignment types
3. Note any grade trend (improving, declining, steady)
4. Give 2-3 specific, actionable recommendations
5. End with encouragement

Keep it under 300 words. Use markdown formatting.`,
    });

    setReport(typeof result === 'string' ? result : result?.response || 'Could not generate report.');
    setGenerating(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground">{course.name}</h2>
          <p className="text-xs text-muted-foreground">{course.code || ''}{course.professor ? ` · ${course.professor}` : ''}</p>
        </div>
        {avg != null && (
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{avg}%</p>
            <p className="text-xs text-muted-foreground">{letterGrade(avg)} · {graded.length} graded</p>
          </div>
        )}
        {avg == null && (
          <p className="text-sm text-muted-foreground">No grades yet</p>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Score per Assignment</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
              <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Report Section */}
      <div className="px-6 pb-5">
        <Button
          variant={report ? 'outline' : 'default'}
          size="sm"
          onClick={report ? () => setExpanded(v => !v) : generateReport}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Generating Report…</>
          ) : report ? (
            <>{expanded ? <ChevronUp className="w-3.5 h-3.5 mr-2" /> : <ChevronDown className="w-3.5 h-3.5 mr-2" />}{expanded ? 'Hide Report' : 'Show Report'}</>
          ) : (
            <><FileText className="w-3.5 h-3.5 mr-2" />Generate Performance Report</>
          )}
        </Button>

        {expanded && report && (
          <div className="mt-4 p-4 bg-muted/50 rounded-xl text-sm prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Insights() {
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: () => base44.entities.Assignment.list() });

  // Overall trend data: average score per course for the overview chart
  const overviewData = courses
    .map(c => {
      const graded = assignments.filter(a => a.course_id === c.id && a.grade != null && a.max_points != null);
      if (!graded.length) return null;
      const avg = Math.round(graded.reduce((s, a) => s + (a.grade / a.max_points) * 100, 0) / graded.length);
      return { name: c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name, avg };
    })
    .filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Performance Insights</h1>
          <p className="text-sm text-muted-foreground">Grade analysis and AI-generated reports for each class</p>
        </div>
      </div>

      {/* Overview chart */}
      {overviewData.length > 1 && (
        <div className="bg-card border border-border rounded-2xl px-6 py-5">
          <p className="text-sm font-semibold mb-4">Overall Average by Course</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={overviewData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Average']} />
              <Bar dataKey="avg" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-course cards */}
      {courses.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No courses yet</p>
          <p className="text-sm">Add courses and grades to see your insights.</p>
        </div>
      )}
      {courses.map(course => (
        <CourseCard
          key={course.id}
          course={course}
          assignments={assignments.filter(a => a.course_id === course.id)}
        />
      ))}
    </div>
  );
}