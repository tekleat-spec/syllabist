import React, { useState, useMemo } from 'react';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Sparkles, Loader2, CheckSquare, BookOpen, AlignLeft, ChevronDown, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import DocumentCard from '@/components/documents/DocumentCard';
import MarkdownContent from '@/components/shared/MarkdownContent';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Documents() {
  const queryClient = useQueryClient();
  const { containerRef, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(
    () => queryClient.invalidateQueries()
  );
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [collapsed, setCollapsed] = useState({});

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
      prompt: `Based on the attached document, create ${typeLabels[generationType]}. 
      
Document Title: ${doc.title}
Document Type: ${doc.type}
${doc.content_summary ? `Stored Summary: ${doc.content_summary}` : ''}

Analyze the full content of the attached file — including all text, figures, tables, and images — and create well-structured, detailed ${typeLabels[generationType]} using markdown formatting. Include all key concepts, important details, and organize the content logically.`,
      model: 'claude_sonnet_4_6',
      ...(doc.file_url && { file_urls: [doc.file_url] }),
    });

    await base44.entities.Document.update(doc.id, {
      generated_content: result,
      generation_type: generationType,
    });

    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setGenerating(null);
  };

  const filtered = courseFilter === 'all' ? documents : documents.filter(d => d.course_id === courseFilter);

  const toggleSelect = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const handleBulkGenerate = async (type) => {
    const docs = filtered.filter(d => selectedIds.includes(d.id));
    if (!docs.length) return;
    setBulkGenerating(true);

    const docsText = docs.map(d =>
      `### ${d.title} (${d.type})\n${d.content_summary || 'No summary available.'}`
    ).join('\n\n---\n\n');

    const label = type === 'summary' ? 'a consolidated summary' : 'a comprehensive study guide';
    const fileUrls = docs.filter(d => d.file_url).map(d => d.file_url);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert study assistant. The student has selected the following ${docs.length} documents and wants ${label} that synthesizes all of them into one cohesive document.

${docsText}

Instructions:
- Analyze the full content of each attached file — including all text, figures, tables, and images
- Merge and synthesize all content — don't just list each doc separately
- Use clear markdown formatting with headers, bullets, and emphasis
- For a study guide: include key concepts, definitions, important facts, and review questions at the end
- For a summary: write flowing prose that captures the most important ideas across all documents
- Be thorough but concise

Documents included: ${docs.map(d => d.title).join(', ')}`,
      model: 'claude_sonnet_4_6',
      ...(fileUrls.length > 0 && { file_urls: fileUrls }),
    });

    const content = typeof result === 'string' ? result : result?.response || '';
    const saveLabel = type === 'study_guide' ? 'Study Guide' : 'Summary';
    const courseIds = docs.map(d => d.course_id).filter(Boolean);
    const course_id = courseIds.length && courseIds.every(id => id === courseIds[0]) ? courseIds[0] : (courseIds[0] || null);
    const name = `${saveLabel}: ${docs.map(d => d.title).join(', ')}`;

    let savedId = null;
    try {
      const created = await base44.entities.Document.create({
        title: name,
        type: type === 'study_guide' ? 'study_guide' : 'other',
        generated_content: content,
        generation_type: type === 'study_guide' ? 'study_guide' : 'summary',
        content_summary: `Consolidated ${saveLabel.toLowerCase()} from: ${docs.map(d => d.title).join(', ')}`,
        status: 'processed',
        course_id,
      });
      savedId = created?.id || null;
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (e) {
      console.error('Failed to auto-save generated content:', e);
    }

    setBulkResult({ type, content, titles: docs.map(d => d.title), savedId, course_id });
    setBulkGenerating(false);
  };

  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleBulkDownload = async () => {
    const docs = filtered.filter(d => d.file_url);
    if (!docs.length) return;
    setDownloadingAll(true);
    for (const doc of docs) {
      const a = document.createElement('a');
      a.href = doc.file_url;
      a.download = doc.title || 'document';
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 400));
    }
    setDownloadingAll(false);
  };

  const handleDownloadContent = (content, filename) => {
    const blob = new Blob([content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteBulkResult = async () => {
    if (!bulkResult?.savedId) { setBulkResult(null); return; }
    setDeletingBulk(true);
    try {
      await base44.entities.Document.delete(bulkResult.savedId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (e) {
      console.error('Failed to delete generated content:', e);
    } finally {
      setDeletingBulk(false);
      setBulkResult(null);
    }
  };

  const courseGroups = useMemo(() => {
    const groups = {};
    filtered.forEach(d => {
      const key = d.course_id || 'unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, [filtered]);

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
      <PageHeader
        title="Documents"
        subtitle="Your uploaded materials and AI-generated content"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingAll || !filtered.some(d => d.file_url)}
              onClick={handleBulkDownload}
            >
              {downloadingAll ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              {downloadingAll ? 'Downloading…' : 'Download All'}
            </Button>
            <Button
              variant={selectionMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => { setSelectionMode(v => !v); setSelectedIds([]); }}
            >
              <CheckSquare className="w-4 h-4 mr-1.5" />
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          </div>
        }
      />

      {/* Bulk action bar */}
      {selectionMode && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl flex-wrap">
          <span className="text-sm font-medium text-primary">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button size="sm" variant="outline" disabled={selectedIds.length < 2 || bulkGenerating} onClick={() => handleBulkGenerate('summary')}>
              {bulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <AlignLeft className="w-3.5 h-3.5 mr-1.5" />}
              Combined Summary
            </Button>
            <Button size="sm" disabled={selectedIds.length < 2 || bulkGenerating} onClick={() => handleBulkGenerate('study_guide')}>
              {bulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <BookOpen className="w-3.5 h-3.5 mr-1.5" />}
              Study Guide
            </Button>
          </div>
          {selectedIds.length < 2 && <p className="text-xs text-muted-foreground w-full">Select at least 2 documents to generate</p>}
        </div>
      )}

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload your course materials — syllabi, slides, notes, PDFs — and we'll help you create study guides, summaries, and more."
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(courseGroups).map(([key, docs]) => {
            const course = key === 'unassigned' ? null : courses.find(c => c.id === key);
            const isCollapsed = collapsed[key];
            return (
              <div key={key}>
                <button
                  onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="flex items-center gap-2 w-full mb-3"
                >
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  <span className="font-semibold text-foreground">{course?.name || 'Unassigned'}</span>
                  <Badge variant="secondary" className="text-[10px]">{docs.length}</Badge>
                </button>
                {!isCollapsed && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map((doc, i) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        course={course}
                        index={i}
                        selectionMode={selectionMode}
                        selected={selectedIds.includes(doc.id)}
                        onToggleSelect={toggleSelect}
                        generating={generating}
                        onDelete={deleteMutation.mutate}
                        onGenerate={handleGenerate}
                        onViewGenerated={setSelectedDoc}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Result Dialog */}
      <Dialog open={!!bulkResult} onOpenChange={() => setBulkResult(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkResult?.type === 'study_guide' ? <BookOpen className="w-4 h-4 text-primary" /> : <AlignLeft className="w-4 h-4 text-primary" />}
              {bulkResult?.type === 'study_guide' ? 'Consolidated Study Guide' : 'Combined Summary'}
            </DialogTitle>
            {bulkResult?.titles && (
              <p className="text-xs text-muted-foreground pt-1">From: {bulkResult.titles.join(', ')}</p>
            )}
          </DialogHeader>
          <div className="mt-4">
            <MarkdownContent content={bulkResult?.content || ''} />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            {bulkResult?.savedId
              ? 'Saved automatically to its course folder.'
              : 'Saved automatically, but could not be assigned to a course.'}
          </p>
          <DialogFooter className="gap-2 sm:gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadContent(bulkResult?.content, `${bulkResult?.type === 'study_guide' ? 'study-guide' : 'summary'}`)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deletingBulk || !bulkResult?.savedId}
              onClick={handleDeleteBulkResult}
            >
              {deletingBulk ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Content Viewer */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {selectedDoc?.title} — {selectedDoc?.generation_type?.replace(/_/g, ' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <MarkdownContent content={selectedDoc?.generated_content || 'No content generated yet.'} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadContent(
                selectedDoc?.generated_content,
                `${selectedDoc?.title}-${(selectedDoc?.generation_type || 'content').replace(/_/g, '-')}`
              )}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}