import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, TrendingUp, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatCard from '@/components/shared/StatCard';
import { motion } from 'framer-motion';

function getLetterGrade(avg) {
  if (avg >= 93) return 'A';
  if (avg >= 90) return 'A-';
  if (avg >= 87) return 'B+';
  if (avg >= 83) return 'B';
  if (avg >= 80) return 'B-';
  if (avg >= 77) return 'C+';
  if (avg >= 73) return 'C';
  if (avg >= 70) return 'C-';
  if (avg >= 67) return 'D+';
  if (avg >= 60) return 'D';
  return 'F';
}

export default function Grades() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = React.useState('all');

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list('-due_date'),
  });

  const updateGrade = useMutation({
    mutationFn: ({ id, grade }) => base44.entities.Assignment.update(id, { grade: parseFloat(grade), status: 'graded' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });

  const filteredAssignments = selectedCourse === 'all'
    ? assignments
    : assignments.filter(a => a.course_id === selectedCourse);

  const gradedAll = assignments.filter(a => a.grade != null);
  const overallAvg = gradedAll.length > 0
    ? (gradedAll.reduce((s, a) => s + a.grade, 0) / gradedAll.length)
    : null;

  const courseStats = courses.map(c => {
    const graded = assignments.filter(a => a.course_id === c.id && a.grade != null);
    const avg = graded.length > 0 ? graded.reduce((s, a) => s + a.grade, 0) / graded.length : null;
    return { ...c, avg, graded: graded.length, total: assignments.filter(a => a.course_id === c.id).length };
  });

  if (assignments.length === 0) {
    return (
      <div>
        <PageHeader title="Grades" subtitle="Track your academic performance" />
        <EmptyState
          icon={GraduationCap}
          title="No assignments yet"
          description="Upload a syllabus to extract assignments, then enter your grades as you receive them."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Grades" subtitle="Track your academic performance" />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={GraduationCap}
          label="Overall Average"
          value={overallAvg ? `${overallAvg.toFixed(1)}%` : '—'}
          sublabel={overallAvg ? getLetterGrade(overallAvg) : undefined}
        />
        <StatCard
          icon={TrendingUp}
          label="Graded"
          value={`${gradedAll.length} / ${assignments.length}`}
          sublabel="assignments"
        />
        <StatCard
          icon={Award}
          label="Highest"
          value={gradedAll.length > 0 ? `${Math.max(...gradedAll.map(a => a.grade))}%` : '—'}
        />
      </div>

      {/* Per-Course Averages */}
      {courseStats.filter(c => c.avg != null).length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {courseStats.map(c => (
            <Card key={c.id} className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{c.name}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold">{c.avg ? `${c.avg.toFixed(1)}%` : '—'}</span>
                {c.avg && <span className="text-xs text-muted-foreground">{getLetterGrade(c.avg)}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{c.graded}/{c.total} graded</p>
            </Card>
          ))}
        </div>
      )}

      {/* Assignments Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <h2 className="font-semibold">All Assignments</h2>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Assignment</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Course</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Weight</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Grade</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssignments.map((a, i) => {
                const course = courses.find(c => c.id === a.course_id);
                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-sm font-medium text-foreground">{a.title}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{course?.name || '—'}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px] capitalize">{a.type?.replace(/_/g, ' ') || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{a.weight ? `${a.weight}%` : '—'}</td>
                    <td className="px-4 py-3.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={a.grade ?? ''}
                        onChange={e => {
                          if (e.target.value !== '') {
                            updateGrade.mutate({ id: a.id, grade: e.target.value });
                          }
                        }}
                        placeholder="—"
                        className="w-20 h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={a.status === 'graded' ? 'default' : a.status === 'submitted' ? 'secondary' : 'outline'}
                        className="text-[10px] capitalize"
                      >
                        {a.status?.replace(/_/g, ' ') || 'upcoming'}
                      </Badge>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}