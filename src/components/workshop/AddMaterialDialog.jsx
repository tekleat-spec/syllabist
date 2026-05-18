import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';

async function analyzeItem(item) {
  const fileUrls = item.file_url ? [item.file_url] : [];
  const urlContext = item.source_url ? `URL to analyze: ${item.source_url}` : '';

  const prompt = `You are an expert academic document analyst. You are reading a document titled "${item.title}".

${urlContext}

FIRST: Determine if this document is (A) assignment instructions/a prompt telling the student what to do, or (B) study material/reference content (lecture notes, readings, textbook, slides, etc.).

Then produce exactly three sections with these exact headers:

---SUMMARY---
If this is ASSIGNMENT INSTRUCTIONS: In 1-2 paragraphs, describe exactly what this assignment is asking the student to do. State the assignment type, topic, and overall objective as described. Start with "**[Assignment Instructions]**".
If this is STUDY MATERIAL: Write a concise 2-4 paragraph summary of the main topic, purpose, and overall structure. Start with "**[Study Material]**".

---KEY INFO---
If this is ASSIGNMENT INSTRUCTIONS: Extract ONLY information explicitly stated. Use these sub-sections (omit any not mentioned):
**Assignment Requirements:** Every task/deliverable the student must complete.
**Formatting Rules:** Page/word count, font, spacing, citation style — only if stated.
**Deadlines & Dates:** Any due dates or submission windows explicitly mentioned.
**Grading Criteria:** Any rubric details or point values explicitly stated.
**Prohibited Items:** Anything explicitly forbidden.

If this is STUDY MATERIAL: Extract all important facts, concepts, definitions, arguments, and key takeaways as a well-organized bullet list.

---OUTLINE---
If this is ASSIGNMENT INSTRUCTIONS: A suggested structural outline for completing the assignment, mapped to the explicit requirements.
If this is STUDY MATERIAL: A structured hierarchical outline (I, II, III / A, B, C) reflecting the actual content structure.`;

  const useInternet = !!item.source_url;
  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: fileUrls.length > 0 ? fileUrls : undefined,
    add_context_from_internet: useInternet,
    model: useInternet ? 'gemini_3_flash' : 'claude_sonnet_4_6',
  });

  const summaryMatch = result.match(/---SUMMARY---([\s\S]*?)(?:---KEY INFO---|$)/);
  const keyMatch = result.match(/---KEY INFO---([\s\S]*?)(?:---OUTLINE---|$)/);
  const outlineMatch = result.match(/---OUTLINE---([\s\S]*?)$/);

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : result,
    key_info: keyMatch ? keyMatch[1].trim() : '',
    outline: outlineMatch ? outlineMatch[1].trim() : '',
    status: 'ready',
  };
}

export default function AddMaterialDialog({ open, onClose, courseId, assignmentName, onAdded }) {
  const [itemType, setItemType] = useState('pdf');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');

  const isFileType = ['pdf', 'slides', 'other', 'instructions'].includes(itemType);
  const isUrlType = ['url', 'video_url'].includes(itemType);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setUploading(true);
    setUploadStage('Uploading…');

    let file_url = '';
    if (isFileType && file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
    }

    // Build the full item data so analyzeItem has file_url available
    const itemData = {
      course_id: courseId,
      assignment_name: assignmentName,
      item_type: itemType,
      title: title.trim(),
      file_url: file_url || undefined,
      source_url: isUrlType ? sourceUrl.trim() : undefined,
      status: 'processing',
    };

    const item = await base44.entities.WorkshopItem.create(itemData);

    // Notify parent so it shows the card immediately with "Analyzing" state
    onAdded();
    onClose();

    // Reset form
    setTitle('');
    setFile(null);
    setSourceUrl('');
    setUploading(false);
    setUploadStage('');

    // Run analysis — pass enriched item object with file_url guaranteed
    const itemWithUrl = { ...item, file_url: file_url || item.file_url, source_url: isUrlType ? sourceUrl.trim() : item.source_url };
    const analysis = await analyzeItem(itemWithUrl);
    await base44.entities.WorkshopItem.update(item.id, analysis);

    // Notify parent again so it refreshes with full analysis
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!uploading) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instructions">Assignment Instructions</SelectItem>
                <SelectItem value="pdf">PDF / Book</SelectItem>
                <SelectItem value="slides">Slides / PowerPoint</SelectItem>
                <SelectItem value="url">Web Page URL</SelectItem>
                <SelectItem value="video_url">Video URL</SelectItem>
                <SelectItem value="other">Other File</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lecture Notes Ch. 3" />
          </div>

          {isFileType && (
            <div className="space-y-1.5">
              <Label>File</Label>
              <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm text-muted-foreground" />
            </div>
          )}

          {isUrlType && (
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading || !title.trim()}>
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{uploadStage}</>
              : <><Upload className="w-4 h-4 mr-2" />Add & Analyze</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}