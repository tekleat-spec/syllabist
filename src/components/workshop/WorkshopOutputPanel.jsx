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
  // Pass all file URLs directly so the LLM can read the raw files, not just extracted text
  const instructionFileUrls = instructionItems.filter(i => i.file_url).map(i => i.file_url);
  const materialFileUrls = materialItems.filter(i => i.file_url).map(i => i.file_url);
  const allFileUrls = [...instructionFileUrls, ...materialFileUrls];

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    const instructionsContext = instructionItems.map(buildItemContext).join('\n\n');
    const materialsContext = materialItems.map(buildItemContext).join('\n\n');

    const prompt = `You are an expert academic writing assistant. Your job is to draft a complete, submission-ready assignment response.

CRITICAL RULES:
- READ THE ATTACHED FILES FIRST. The attached files are the primary source of truth — they contain the actual assignment instructions and study materials.
- The draft must be grounded ONLY in what the instructions explicitly require and what the study materials actually contain.
- Do NOT invent facts, sources, data, or requirements not present in the provided materials.
- If the instructions specify a format, length, citation style, or structure — follow it exactly.

ASSIGNMENT NAME: "${assignmentName}"

${instructionFileUrls.length > 0
  ? `INSTRUCTION FILES ATTACHED: ${instructionFileUrls.length} file(s) attached above — read them to understand the exact assignment requirements.`
  : `NO INSTRUCTION FILES: Use the extracted text below as the instructions context.`
}

===EXTRACTED ASSIGNMENT INSTRUCTIONS===
${instructionsContext || 'No instructions uploaded — base the draft on the study materials only.'}

===EXTRACTED STUDY MATERIALS===
${materialsContext || 'No additional study materials provided — work from the instructions alone.'}

===YOUR TASK===
Produce exactly TWO sections using these exact headers:

---DRAFT---
Write a complete, polished, submission-ready assignment draft that:
- Addresses every explicit requirement, question, or deliverable stated in the instructions — nothing more, nothing less.
- Draws all content, evidence, and arguments directly from the study materials provided.
- Follows any formatting, length, citation, or structural rules stated in the instructions.
- Is written in a clear academic tone appropriate for the assignment type.

---STUDY AIDS---
Based strictly on the instructions and materials above, produce:
1. **Exact Requirements Checklist** — every task/deliverable explicitly stated in the instructions (quote directly where possible)
2. **Key Concepts from Materials** — terms and ideas drawn from the actual study materials
3. **Evidence & Facts Available** — specific data points, quotes, or facts from the uploaded materials that can be used
4. **Suggested Structure** — a draft outline mapped directly to the stated requirements
5. **Gaps & Notes** — flag any requirements that couldn't be fully addressed due to missing materials`;

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