import { base44 } from '@/api/base44Client';

export function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)>]+/gi) || [];
  return [...new Set(matches.map((u) => u.replace(/[.,;:!?)]+$/, '')))];
}

export async function fetchLinkContents(text) {
  const urls = extractUrls(text);
  if (!urls.length) return '';
  const parts = [];
  for (const url of urls.slice(0, 3)) {
    try {
      const res = await base44.functions.invoke('fetchUrlContent', { url });
      const data = res.data;
      if (data?.content) {
        parts.push(`===LINK CONTENT: ${url}===\nTitle: ${data.title || ''}\n${data.content}`);
      }
    } catch (e) {
      console.error('fetchLinkContents failed for', url, e);
    }
  }
  return parts.join('\n\n');
}