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

  const prompt = `You are an expert academic analyst. Analyze the following study material titled "${item.title}" (type: ${item.item_type}).

${urlContext}

Produce exactly three sections with these exact headers:

---SUMMARY---
Write a concise but thorough 2-4 paragraph summary of what this material contains. Explain the main topic, purpose, and overall structure.

---KEY INFO---
Extract and list all important facts, concepts, definitions, arguments, data points, and takeaways as a well-organized bullet list. Group related items under sub-headers if appropriate.

---OUTLINE---
Create a structured hierarchical outline of the material with main sections (I, II, III…) and sub-points (A, B, C…). Reflect the actual structure and flow of the content.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: fileUrls.length > 0 ? fileUrls : undefined,
    add_context_from_internet: !!item.source_url,
    model: item.source_url ? 'gemini_3_flash' : 'claude_sonnet_4_6',
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

    // Create item with processing status
    const item = await base44.entities.WorkshopItem.create({
      course_id: courseId,
      assignment_name: assignmentName,
      item_type: itemType,
      title: title.trim(),
      file_url: file_url || undefined,
      source_url: isUrlType ? sourceUrl.trim() : undefined,
      status: 'processing',
    });

    // Notify parent so it shows the card immediately with "Analyzing" state
    onAdded();
    onClose();

    // Reset form
    setTitle('');
    setFile(null);
    setSourceUrl('');
    setUploading(false);
    setUploadStage('');

    // Run analysis in background and update the item
    setUploadStage('Analyzing…');
    const analysis = await analyzeItem(item);
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