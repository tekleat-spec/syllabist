import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CourseDialog({ open, onOpenChange, course }) {
  const queryClient = useQueryClient();
  const isEdit = !!course;

  const [form, setForm] = useState({
    name: '', code: '', professor: '', semester: '', notes: ''
  });

  useEffect(() => {
    if (course) {
      setForm({
        name: course.name || '',
        code: course.code || '',
        professor: course.professor || '',
        semester: course.semester || '',
        notes: course.notes || '',
      });
    } else {
      setForm({ name: '', code: '', professor: '', semester: '', notes: '' });
    }
  }, [course, open]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.Course.update(course.id, data)
      : base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Course' : 'Add Course'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Course Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Constitutional Law" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Course Code</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. LAW 301" />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} placeholder="e.g. Fall 2026" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Professor</Label>
            <Input value={form.professor} onChange={e => setForm({ ...form, professor: e.target.value })} placeholder="Professor name" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}