import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Trash2, Edit2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CourseDialog from '@/components/courses/CourseDialog';
import { motion } from 'framer-motion';

const courseColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'
];

export default function Courses() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['courses'] });
      const prev = queryClient.getQueryData(['courses']);
      queryClient.setQueryData(['courses'], old => (old || []).filter(c => c.id !== id));
      return { prev };
    },
    onError: (_err, _id, context) => queryClient.setQueryData(['courses'], context.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const getAssignmentCount = (courseId) => assignments.filter(a => a.course_id === courseId).length;
  const getCourseAvg = (courseId) => {
    const graded = assignments.filter(a => a.course_id === courseId && a.grade != null);
    if (graded.length === 0) return null;
    return (graded.reduce((sum, a) => sum + a.grade, 0) / graded.length).toFixed(1);
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Manage your enrolled courses"
        actions={
          <Button onClick={() => { setEditingCourse(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Course
          </Button>
        }
      />

      {courses.length === 0 && !isLoading ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Add your first course or upload a syllabus to get started."
          action={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Course
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, i) => {
            const colorClass = courseColors[i % courseColors.length];
            const avg = getCourseAvg(course.id);
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-5 hover:shadow-md transition-shadow relative group">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCourse(course); setDialogOpen(true); }}>
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(course.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{course.name}</h3>
                  {course.code && <p className="text-xs text-muted-foreground font-mono mb-2">{course.code}</p>}
                  {course.professor && <p className="text-sm text-muted-foreground mb-3">{course.professor}</p>}

                  <div className="flex items-center gap-2 mt-auto">
                    <Badge variant="secondary" className="text-xs">
                      {getAssignmentCount(course.id)} assignments
                    </Badge>
                    {avg && (
                      <Badge variant="outline" className="text-xs">
                        Avg: {avg}%
                      </Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={editingCourse}
      />
    </div>
  );
}