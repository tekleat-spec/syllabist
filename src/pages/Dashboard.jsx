import React from 'react';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Calendar, GraduationCap, FileText, Clock, AlertTriangle, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { containerRef, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(
    () => queryClient.invalidateQueries()
  );

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list('-due_date'),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 5),
  });

  const upcomingAssignments = assignments
    .filter(a => a.due_date && isFuture(new Date(a.due_date)) && a.status !== 'submitted' && a.status !== 'graded')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const gradedAssignments = assignments.filter(a => a.grade !== undefined && a.grade !== null);
  const overallAvg = gradedAssignments.length > 0
    ? (gradedAssignments.reduce((sum, a) => sum + a.grade, 0) / gradedAssignments.length).toFixed(1)
    : '—';

  const hasData = courses.length > 0;

  if (!hasData) {
    return (
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <PageHeader title="Dashboard" subtitle="Your study command center" />
        <EmptyState
          icon={Upload}
          title="Welcome to StudyBuddy"
          description="Get started by uploading your course syllabus. We'll automatically extract deadlines, assignments, and build your calendar."
          action={
            <Link to="/upload">
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Your First Syllabus
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {refreshing && (
        <div className="flex justify-center py-3 text-xs text-muted-foreground">Refreshing…</div>
      )}
      <PageHeader title="Dashboard" subtitle="Your study command center" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Courses" value={courses.length} />
        <StatCard icon={Calendar} label="Upcoming" value={upcomingAssignments.length} sublabel="deadlines" />
        <StatCard icon={GraduationCap} label="Average" value={overallAvg} sublabel="overall grade" />
        <StatCard icon={FileText} label="Documents" value={documents.length} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Upcoming Deadlines</h2>
            <Link to="/calendar">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No upcoming deadlines
            </div>
          ) : (
            <div className="divide-y divide-border">
              {upcomingAssignments.map((a, i) => {
                const daysLeft = differenceInDays(new Date(a.due_date), new Date());
                const course = courses.find(c => c.id === a.course_id);
                const isUrgent = daysLeft <= 2;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-destructive animate-pulse' : 'bg-primary'}`} />
                      <div>
                        <p className="font-medium text-sm text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{course?.name || 'Unknown course'}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-xs">
                        {isUrgent && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(a.due_date), 'MMM d')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Documents */}
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Documents</h2>
            <Link to="/documents">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </div>
          {documents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No documents uploaded yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {documents.slice(0, 5).map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-6 py-3.5 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.type?.replace(/_/g, ' ')}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}