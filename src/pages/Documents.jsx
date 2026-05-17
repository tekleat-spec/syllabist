import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, Download, Sparkles, Eye, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function Documents() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleGenerate = async (doc, generationType) => {
    setGenerating(doc.id);
    const typeLabels = {
      study_guide: 'a comprehensive study guide',
      summary: 'a detailed summary',
      flashcards: 'flashcards (Q&A format)',
      outline: 'a structured outline',
      paper_draft: 'a paper draft',
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on the following document content, create ${typeLabels[generationType]}. 
      
Document Title: ${doc.title}
Document Summary: ${doc.content_summary || 'No summary available'}
Document Type: ${doc.type}

Please create well-structured, detailed ${typeLabels[generationType]} using markdown formatting. Include all key concepts, important details, and organize the content logically.`,
      model: 'claude_sonnet_4_6',
    });

    await base44.entities.Document.update(doc.id, {
      generated_content: result,
      generation_type: generationType,
    });

    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setGenerating(null);
  };

  const filtered = courseFilter === 'all' ? documents : documents.filter(d => d.course_id === courseFilter);

  const typeIcons = {
    syllabus: '📋', slides: '📊', notes: '📝', pdf: '📄', study_guide: '📚',
    paper_draft: '✍️', announcement: '📢', other: '📎',
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Your uploaded materials and AI-generated content"
        actions={
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload your course materials — syllabi, slides, notes, PDFs — and we'll help you create study guides, summaries, and more."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc, i) => {
            const course = courses.find(c => c.id === doc.course_id);
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="p-5 hover:shadow-md transition-shadow group relative">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{typeIcons[doc.type] || typeIcons.other}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {doc.file_url && (
                          <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                            <Download className="w-3.5 h-3.5 mr-2" /> Download
                          </DropdownMenuItem>
                        )}
                        {doc.generated_content && (
                          <DropdownMenuItem onClick={() => setSelectedDoc(doc)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> View Generated
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{doc.title}</h3>
                  {course && <p className="text-xs text-muted-foreground mb-2">{course.name}</p>}
                  {doc.content_summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.content_summary}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] capitalize">{doc.type?.replace(/_/g, ' ')}</Badge>
                    {doc.generation_type && doc.generation_type !== 'none' && (
                      <Badge className="text-[10px] capitalize bg-primary/10 text-primary border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {doc.generation_type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  {/* AI Generate buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {['study_guide', 'summary', 'flashcards', 'outline'].map(type => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 px-2"
                        disabled={generating === doc.id}
                        onClick={() => handleGenerate(doc, type)}
                      >
                        {generating === doc.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1" />
                        )}
                        {type.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-3">
                    {format(new Date(doc.created_date), 'MMM d, yyyy')}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Generated Content Viewer */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {selectedDoc?.title} — {selectedDoc?.generation_type?.replace(/_/g, ' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none mt-4">
            <ReactMarkdown>{selectedDoc?.generated_content || 'No content generated yet.'}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}