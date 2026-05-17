import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function WorkshopOutputPanel({ courseId, assignmentName, items, output, onOutputSaved }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);

    // Build context from all items
    const instructionItems = items.filter(i => i.item_type === 'instructions');
    const materialItems = items.filter(i => i.item_type !== 'instructions');

    const instructionsText = instructionItems.map(i =>
      `[INSTRUCTIONS: ${i.title}]\n${i.extracted_text || i.source_url || '(file uploaded)'}`
    ).join('\n\n');

    const materialsText = materialItems.map(i =>
      `[MATERIAL: ${i.title} (${i.item_type})]\n${i.extracted_text || i.source_url || '(file uploaded)'}`
    ).join('\n\n');

    const fileUrls = items.filter(i => i.file_url).map(i => i.file_url);

    const prompt = `You are an expert academic assistant. 

ASSIGNMENT: "${assignmentName}"

INSTRUCTIONS FROM PROFESSOR:
${instructionsText || 'No explicit instructions provided — infer from materials.'}

STUDY MATERIALS:
${materialsText || 'No text materials — use uploaded files.'}

Your task is to produce TWO sections:

---DRAFT---
Write a complete, polished, submission-ready draft that directly answers/fulfills the assignment instructions. Use the study materials as your primary source. Be thorough, well-structured, properly cited where applicable, and written in an academic tone.

---STUDY AIDS---
Produce comprehensive study aids including:
1. Key Concepts & Definitions (bullet list)
2. Main Arguments / Themes (numbered)
3. Important Facts to Remember
4. Outline of the Topic
5. 5 Practice Questions with Answers

Make both sections as detailed and useful as possible.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls.length > 0 ? fileUrls : undefined,
      model: 'claude_sonnet_4_6',
    });

    // Split on the markers
    const draftMatch = result.match(/---DRAFT---([\s\S]*?)(?:---STUDY AIDS---|$)/);
    const studyMatch = result.match(/---STUDY AIDS---([\s\S]*?)$/);

    const draft = draftMatch ? draftMatch[1].trim() : result;
    const study_aids = studyMatch ? studyMatch[1].trim() : '';

    // Save or update output
    const existing = await base44.entities.WorkshopOutput.filter({ course_id: courseId, assignment_name: assignmentName });
    if (existing.length > 0) {
      await base44.entities.WorkshopOutput.update(existing[0].id, {
        draft, study_aids, status: 'done', generated_at: new Date().toISOString()
      });
    } else {
      await base44.entities.WorkshopOutput.create({
        course_id: courseId, assignment_name: assignmentName,
        draft, study_aids, status: 'done', generated_at: new Date().toISOString()
      });
    }

    onOutputSaved();
    setGenerating(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">AI Output</h3>
        <Button size="sm" onClick={handleGenerate} disabled={generating || items.length === 0}>
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generating…</>
            : output
              ? <><RefreshCw className="w-4 h-4 mr-1" /> Regenerate</>
              : <><Sparkles className="w-4 h-4 mr-1" /> Generate</>
          }
        </Button>
      </div>

      {!output && !generating && (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm p-8">
          <div>
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Upload your materials and instructions, then click Generate to get a full draft + study aids.</p>
          </div>
        </div>
      )}

      {generating && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analyzing materials and generating output…
        </div>
      )}

      {output && !generating && (
        <Tabs defaultValue="draft" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="draft" className="flex-1">Full Draft</TabsTrigger>
            <TabsTrigger value="study" className="flex-1">Study Aids</TabsTrigger>
          </TabsList>
          <TabsContent value="draft" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="prose prose-sm max-w-none pr-2">
                <ReactMarkdown>{output.draft}</ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="study" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="prose prose-sm max-w-none pr-2">
                <ReactMarkdown>{output.study_aids}</ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}