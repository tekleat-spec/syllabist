import React from 'react';
import { Trash2, Download, Sparkles, Eye, MoreVertical, Loader2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const typeIcons = {
  syllabus: '📋', slides: '📊', notes: '📝', pdf: '📄', study_guide: '📚',
  paper_draft: '✍️', announcement: '📢', other: '📎',
};

export default function DocumentCard({ doc, course, index, selectionMode, selected, onToggleSelect, generating, onDelete, onGenerate, onViewGenerated }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className={`p-5 hover:shadow-md transition-shadow group relative ${selectionMode ? 'cursor-pointer' : doc.file_url ? 'cursor-pointer hover:border-primary/40' : ''} ${selectionMode && selected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        onClick={selectionMode ? () => onToggleSelect(doc.id) : doc.file_url ? () => window.open(doc.file_url, '_blank') : undefined}
      >
        {selectionMode && (
          <div className="absolute top-3 left-3 z-10">
            {selected
              ? <CheckSquare className="w-5 h-5 text-primary" />
              : <Square className="w-5 h-5 text-muted-foreground" />}
          </div>
        )}
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{typeIcons[doc.type] || typeIcons.other}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {doc.file_url && (
                <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                  <Eye className="w-3.5 h-3.5 mr-2" /> View
                </DropdownMenuItem>
              )}
              {doc.file_url && (
                <DropdownMenuItem onClick={() => { const a = document.createElement('a'); a.href = doc.file_url; a.download = doc.title || ''; a.target='_blank'; a.click(); }}>
                  <Download className="w-3.5 h-3.5 mr-2" /> Download
                </DropdownMenuItem>
              )}
              {doc.generation_type && doc.generation_type !== 'none' && (
                <DropdownMenuItem onClick={() => onViewGenerated(doc)}>
                  <Eye className="w-3.5 h-3.5 mr-2" /> View Generated
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(doc.id)}>
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

        <div className="flex flex-wrap gap-1.5">
          {['study_guide', 'summary', 'flashcards', 'outline'].map(type => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="text-[10px] h-7 px-2"
              disabled={generating === doc.id}
              onClick={(e) => { e.stopPropagation(); onGenerate(doc, type); }}
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
}