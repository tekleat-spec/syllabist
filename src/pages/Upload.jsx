import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload as UploadIcon, FileUp, Loader2, CheckCircle2, BookOpen, FileText, Megaphone, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Upload() {
  const queryClient = useQueryClient();
  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'syllabus';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [file, setFile] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a file.'); return; }

    setProcessing(true);
    setDone(false);

    // Determine course
    let targetCourseId = courseId;
    if (courseId === 'new' && newCourseName) {
      const newCourse = await base44.entities.Course.create({ name: newCourseName });
      targetCourseId = newCourse.id;
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const docType = activeTab === 'syllabus' ? 'syllabus' : activeTab === 'announcement' ? 'announcement' : 'notes';

    if (activeTab === 'syllabus') {
      await processSyllabus(file_url, targetCourseId, docType);
    } else if (activeTab === 'announcement') {
      await processAnnouncement(file_url, targetCourseId, docType);
    } else if (activeTab === 'gradebook') {
      await processGradebook(file_url, targetCourseId);
    } else {
      await processMaterial(file_url, targetCourseId);
    }

    setProcessing(false);
    setDone(true);
    setFile(null);
    setTimeout(() => setDone(false), 3000);
  };

  const processSyllabus = async (fileUrl, targetCourseId, docType) => {
    // Extract structured data from syllabus
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          course_name: { type: 'string' },
          professor: { type: 'string' },
          course_code: { type: 'string' },
          semester: { type: 'string' },
          summary: { type: 'string', description: 'Brief summary of the course' },
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                type: { type: 'string', enum: ['homework', 'exam', 'quiz', 'project', 'paper', 'presentation', 'lab', 'reading', 'other'] },
                due_date: { type: 'string', description: 'ISO date string if available' },
                weight: { type: 'number', description: 'Percentage weight of final grade' },
                description: { type: 'string' },
              }
            }
          },
          important_dates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                date: { type: 'string', description: 'ISO date string' },
                type: { type: 'string', enum: ['deadline', 'exam', 'class', 'office_hours', 'other'] },
                description: { type: 'string' },
              }
            }
          }
        }
      }
    });

    if (extracted.status === 'success' && extracted.output) {
      const data = extracted.output;

      // Update course info if extracted
      if (targetCourseId && (data.professor || data.course_code || data.semester)) {
        await base44.entities.Course.update(targetCourseId, {
          ...(data.professor && { professor: data.professor }),
          ...(data.course_code && { code: data.course_code }),
          ...(data.semester && { semester: data.semester }),
          syllabus_url: fileUrl,
        });
      }

      // Create assignments
      if (data.assignments?.length > 0) {
        const assignmentData = data.assignments.map(a => ({
          title: a.title,
          course_id: targetCourseId,
          type: a.type || 'other',
          due_date: a.due_date || undefined,
          weight: a.weight || undefined,
          description: a.description || undefined,
          status: 'upcoming',
        }));
        await base44.entities.Assignment.bulkCreate(assignmentData);
      }

      // Create calendar events
      if (data.important_dates?.length > 0) {
        const eventData = data.important_dates
          .filter(d => d.date)
          .map(d => ({
            title: d.title,
            course_id: targetCourseId,
            event_type: d.type || 'other',
            start_date: d.date,
            description: d.description || undefined,
          }));
        if (eventData.length > 0) {
          await base44.entities.CalendarEvent.bulkCreate(eventData);
        }
      }

      // Save document
      await base44.entities.Document.create({
        title: data.course_name ? `${data.course_name} Syllabus` : 'Syllabus',
        course_id: targetCourseId,
        type: docType,
        file_url: fileUrl,
        content_summary: data.summary || undefined,
        status: 'processed',
      });

      queryClient.invalidateQueries();
      toast.success(`Syllabus processed! Found ${data.assignments?.length || 0} assignments and ${data.important_dates?.length || 0} important dates.`);
    }
  };

  const processAnnouncement = async (fileUrl, targetCourseId, docType) => {
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          new_deadlines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                due_date: { type: 'string' },
                type: { type: 'string', enum: ['homework', 'exam', 'quiz', 'project', 'paper', 'presentation', 'lab', 'reading', 'other'] },
                description: { type: 'string' },
              }
            }
          },
          date_changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                new_date: { type: 'string' },
                type: { type: 'string', enum: ['deadline', 'exam', 'class', 'other'] },
                description: { type: 'string' },
              }
            }
          }
        }
      }
    });

    if (extracted.status === 'success' && extracted.output) {
      const data = extracted.output;

      if (data.new_deadlines?.length > 0) {
        const newAssignments = data.new_deadlines.map(d => ({
          title: d.title,
          course_id: targetCourseId,
          type: d.type || 'other',
          due_date: d.due_date || undefined,
          description: d.description || undefined,
          status: 'upcoming',
        }));
        await base44.entities.Assignment.bulkCreate(newAssignments);
      }

      if (data.date_changes?.length > 0) {
        const newEvents = data.date_changes
          .filter(d => d.new_date)
          .map(d => ({
            title: d.title,
            course_id: targetCourseId,
            event_type: d.type || 'other',
            start_date: d.new_date,
            description: d.description || undefined,
          }));
        if (newEvents.length > 0) {
          await base44.entities.CalendarEvent.bulkCreate(newEvents);
        }
      }

      await base44.entities.Document.create({
        title: data.title || 'Announcement',
        course_id: targetCourseId,
        type: docType,
        file_url: fileUrl,
        content_summary: data.summary || undefined,
        status: 'processed',
      });

      queryClient.invalidateQueries();
      toast.success(`Announcement processed! Found ${data.new_deadlines?.length || 0} new deadlines.`);
    }
  };

  const processMaterial = async (fileUrl, targetCourseId) => {
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string', description: 'Comprehensive summary of the material' },
          key_topics: { type: 'array', items: { type: 'string' } },
          document_type: { type: 'string', enum: ['slides', 'notes', 'pdf', 'other'] },
        }
      }
    });

    if (extracted.status === 'success' && extracted.output) {
      const data = extracted.output;

      await base44.entities.Document.create({
        title: data.title || file?.name || 'Course Material',
        course_id: targetCourseId,
        type: data.document_type || 'other',
        file_url: fileUrl,
        content_summary: data.summary || undefined,
        status: 'processed',
      });

      queryClient.invalidateQueries();
      toast.success('Material uploaded and processed!');
    }
  };

  const processGradebook = async (fileUrl, targetCourseId) => {
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          grades: {
            type: 'array',
            description: 'ALL items in the gradebook — both graded and ungraded/pending. Include every row.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Assignment/exam/quiz name exactly as shown' },
                type: { type: 'string', enum: ['homework', 'exam', 'quiz', 'project', 'paper', 'presentation', 'lab', 'reading', 'other'] },
                grade: { type: 'number', description: 'Numeric percentage grade on 0-100 scale. Omit (do not include the field) if not yet graded, not submitted, or shown as dash/blank/N/A.' },
                points_earned: { type: 'number', description: 'Points earned. Omit if not graded yet.' },
                points_possible: { type: 'number', description: 'Maximum points possible. Include even for ungraded items if shown.' },
                weight: { type: 'number', description: 'Weight as % of final grade if shown' },
                due_date: { type: 'string', description: 'Due date as ISO string if visible' },
              },
              required: ['title']
            }
          }
        }
      }
    });

    if (extracted.status !== 'success' || !extracted.output?.grades?.length) {
      toast.error('Could not extract grade data from the file.');
      return;
    }

    const gradeItems = extracted.output.grades;

    // Fetch existing assignments for the course
    const existing = await base44.entities.Assignment.filter({ course_id: targetCourseId });

    let updated = 0;
    let created = 0;

    // Normalize title for fuzzy matching
    const normalize = s => s?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

    for (const item of gradeItems) {
      if (!item.title) continue;

      // Compute grade percentage if possible
      const gradeValue = item.grade != null
        ? item.grade
        : (item.points_earned != null && item.points_possible && item.points_possible > 0)
          ? parseFloat(((item.points_earned / item.points_possible) * 100).toFixed(2))
          : null;

      const hasGrade = gradeValue != null;

      const match = existing.find(a => normalize(a.title) === normalize(item.title));

      if (match) {
        // Only update fields that the gradebook actually provides
        const updatePayload = {};
        if (hasGrade) {
          updatePayload.grade = parseFloat(gradeValue.toFixed(2));
          updatePayload.status = 'graded';
        }
        if (item.points_earned != null) updatePayload.points_earned = item.points_earned;
        if (item.points_possible != null) updatePayload.max_points = item.points_possible;
        if (item.weight != null) updatePayload.weight = item.weight;

        if (Object.keys(updatePayload).length > 0) {
          await base44.entities.Assignment.update(match.id, updatePayload);
          updated++;
        }
      } else if (hasGrade) {
        // Only create a new assignment if we actually have a grade for it
        await base44.entities.Assignment.create({
          title: item.title,
          course_id: targetCourseId,
          type: item.type || 'other',
          grade: parseFloat(gradeValue.toFixed(2)),
          ...(item.points_earned != null && { points_earned: item.points_earned }),
          ...(item.points_possible != null && { max_points: item.points_possible }),
          ...(item.weight != null && { weight: item.weight }),
          ...(item.due_date && { due_date: item.due_date }),
          status: 'graded',
        });
        created++;
      }
    }

    queryClient.invalidateQueries();
    toast.success(`Gradebook imported! ${updated} assignment${updated !== 1 ? 's' : ''} updated, ${created} new assignment${created !== 1 ? 's' : ''} created.`);
  };

  return (
    <div>
      <PageHeader title="Upload" subtitle="Upload syllabi, announcements, and course materials" />

      <Card className="max-w-2xl mx-auto p-6 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="syllabus" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4" /> Syllabus
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="w-4 h-4" /> Announcement
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" /> Material
            </TabsTrigger>
            <TabsTrigger value="gradebook" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="w-4 h-4" /> Gradebook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="syllabus">
            <p className="text-sm text-muted-foreground mb-6">
              Upload your course syllabus and we'll automatically extract assignments, deadlines, exam dates, and important information.
            </p>
          </TabsContent>
          <TabsContent value="announcement">
            <p className="text-sm text-muted-foreground mb-6">
              Upload professor announcements or updates. We'll extract any new deadlines or schedule changes.
            </p>
          </TabsContent>
          <TabsContent value="material">
            <p className="text-sm text-muted-foreground mb-6">
              Upload slides, notes, PDFs, or other materials. We'll process them so you can generate study guides, summaries, and more.
            </p>
          </TabsContent>
          <TabsContent value="gradebook">
            <p className="text-sm text-muted-foreground mb-6">
              Upload a gradebook PDF or screenshot. We'll extract every grade and match it to your existing assignments — or create new ones if they're not in the system yet.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-5">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                <SelectItem value="new">+ Create new course</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {courseId === 'new' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
              <Label>New Course Name</Label>
              <Input value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="e.g. Constitutional Law" />
            </motion.div>
          )}

          {/* File Upload Zone */}
          <div className="space-y-2">
            <Label>File</Label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.html"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drop your file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, PPTX, TXT, images</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </label>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={processing || !file || (!courseId || (courseId === 'new' && !newCourseName))}
            className="w-full gap-2"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Done!
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}