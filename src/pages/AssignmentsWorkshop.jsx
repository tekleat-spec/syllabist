import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import CourseFolder from '@/components/workshop/CourseFolder';
import EmptyState from '@/components/shared/EmptyState';

export default function AssignmentsWorkshop() {
  const location = useLocation();
  const expandCourseId = location.state?.expandCourseId;
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments Workshop</h1>
          <p className="text-sm text-muted-foreground">Upload materials, get a full draft + study aids — organized by course &amp; assignment.</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No courses yet"
          description="Add courses first, then use the Workshop to build assignments."
        />
      ) : (
        <div className="space-y-4">
          {courses.map(course => (
            <CourseFolder
              key={course.id}
              course={course}
              assignments={assignments.filter(a => a.course_id === course.id)}
              documents={documents.filter(d => d.course_id === course.id)}
              defaultOpen={course.id === expandCourseId}
            />
          ))}
        </div>
      )}
    </div>
  );
}