import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function buildItemContext(item) {
  const parts = [`[${item.item_type.toUpperCase()}: ${item.title}]`];
  if (item.summary) parts.push(`Summary: ${item.summary}`);
  if (item.key_info) parts.push(`Key Information:\n${item.key_info}`);
  if (item.outline) parts.push(`Outline:\n${item.outline}`);
  if (!item.summary && !item.key_info && item.source_url) parts.push(`Source: ${item.source_url}`);
  return parts.join('\n');
}

export default function WorkshopOutputPanel({ courseId, assignmentName, items, output, onOutputSaved }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const instructionItems = items.filter(i => i.item_type === 'instructions');
  const materialItems = items.filter(i => i.item_type !== 'instructions');
  const hasInstructions = instructionItems.length > 0;
  const processingItems = items.filter(i => i.status === 'processing');
  const fileUrls = items.filter(i => i.file_url).map(i => i.file_url);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    const instructionsContext = instructionItems.map(buildItemContext).join('\n\n');
    const materialsContext = materialItems.map(buildItemContext).join('\n\n');

    // Pull raw instruction text for direct reading if files available
    const instructionFileUrls = instructionItems.filter(i => i.file_url).map(i => i.file_url);
    const allFileUrls = fileUrls;

    const prompt = `You are an expert academic writing assistant. Your job is to draft a complete, submission-ready assignment response.

ASSIGNMENT NAME: "${assignmentName}"

===ASSIGNMENT INSTRUCTIONS===
${instructionsContext || 'No explicit instructions uploaded — infer the assignment requirements from the study materials below.'}

===STUDY MATERIALS & SOURCES===
${materialsContext || 'No additional study materials provided — work from the instructions alone.'}

===YOUR TASK===
Produce exactly TWO sections using these exact headers:

---DRAFT---
Write a complete, polished, submission-ready assignment draft that directly fulfills every requirement in the instructions.
- Read the instructions carefully and address every question, prompt, or requirement.
- Use the study materials as your primary evidence and source content.
- Structure the response appropriately for the assignment type (essay, report, answers, etc.).
- Use an academic tone, well-organized paragraphs, and cite materials where relevant.
- Be as detailed and thorough as possible — this should be ready to submit.

---STUDY AIDS---
Produce a comprehensive study companion including:
1. **Assignment Breakdown** — list every specific requirement/question from the instructions
2. **Key Concepts & Definitions** — all important terms and their definitions
3. **Main Arguments / Themes** — the core ideas to address
4. **Important Facts & Evidence** — key data points, quotes, or facts from the materials
5. **Structural Outline** — a hierarchical outline for the draft
6. **5 Practice Questions with Answers** — to reinforce understanding`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: allFileUrls.length > 0 ? allFileUrls : undefined,
      model: 'claude_sonnet_4_6',
    });

    const draftMatch = result.match(/---DRAFT---([\s\S]*?)(?:---STUDY AIDS---|$)/);
    const studyMatch = result.match(/---STUDY AIDS---([\s\S]*?)$/);

    const draft = draftMatch ? draftMatch[1].trim() : result;
    const study_aids = studyMatch ? studyMatch[1].trim() : '';

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
        <Button size="sm" onClick={handleGenerate} disabled={generating || items.length === 0 || processingItems.length > 0}>
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Generating…</>
            : output
              ? <><RefreshCw className="w-4 h-4 mr-1" />Regenerate</>
              : <><Sparkles className="w-4 h-4 mr-1" />Generate Draft</>
          }
        </Button>
      </div>

      {processingItems.length > 0 && !generating && (
        <div className="mb-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {processingItems.length} material{processingItems.length > 1 ? 's are' : ' is'} still being analyzed. Wait for analysis to complete before generating.
        </div>
      )}

      {!hasInstructions && items.length > 0 && !generating && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          No assignment instructions uploaded. Add an "Assignment Instructions" file for the best draft quality.
        </div>
      )}

      {!output && !generating && (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm p-8">
          <div>
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">Ready to draft your assignment</p>
            <p className="text-xs opacity-70">Upload your assignment instructions + study materials, then click Generate Draft.</p>
          </div>
        </div>
      )}

      {generating && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">Constructing your draft…</p>
            <p className="text-xs opacity-70 mt-1">Reading instructions, synthesizing materials, writing draft</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {output && !generating && (
        <Tabs defaultValue="draft" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="draft" className="flex-1">Full Draft</TabsTrigger>
            <TabsTrigger value="study" className="flex-1">Study Aids</TabsTrigger>
          </TabsList>
          <TabsContent value="draft" className="flex-1 min-h-0">
            <ScrollArea className="h-full max-h-96">
              <div className="prose prose-sm max-w-none pr-2">
                <ReactMarkdown>{output.draft}</ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="study" className="flex-1 min-h-0">
            <ScrollArea className="h-full max-h-96">
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