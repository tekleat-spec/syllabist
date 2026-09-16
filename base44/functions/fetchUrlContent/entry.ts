import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function htmlToText(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ');

  const art = h.match(/<article[\s\S]*?<\/article>/i);
  if (art) h = art[0];
  else {
    const main = h.match(/<main[\s\S]*?<\/main>/i);
    if (main) h = main[0];
  }

  h = h
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ');

  h = decodeEntities(h);
  h = h.replace(/[ \t]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return h;
}

function extractTitle(html, fallback) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const t = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return decodeEntities((og?.[1] || t?.[1] || fallback || '')).trim();
}

async function fetchYouTube(id) {
  const apiKey = secrets.get('YOUTUBE_API_KEY');
  let title = '';
  let channel = '';
  let description = '';
  if (apiKey) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${apiKey}`);
      const d = await r.json();
      const item = d.items?.[0];
      if (item) {
        title = item.snippet?.title || '';
        channel = item.snippet?.channelTitle || '';
        description = item.snippet?.description || '';
      }
    } catch (e) {
      console.error('YT metadata error:', e);
    }
  }

  let transcript = '';
  try {
    const wr = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await wr.text();
    const tracksMatch = html.match(/"captionTracks":(\[[^\]]*\])/);
    if (tracksMatch) {
      let tracks = [];
      try { tracks = JSON.parse(tracksMatch[1]); } catch (e) { tracks = []; }
      const en = tracks.find((t) => t.languageCode?.startsWith('en')) || tracks[0];
      if (en?.baseUrl) {
        const tr = await fetch(en.baseUrl + '&fmt=json3');
        const td = await tr.json();
        transcript = (td.events || [])
          .filter((ev) => ev.segs)
          .map((ev) => ev.segs.map((s) => s.utf8 || '').join(''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
  } catch (e) {
    console.error('YT transcript error:', e);
  }

  const parts = [];
  if (title) parts.push(`Title: ${title}`);
  if (channel) parts.push(`Channel: ${channel}`);
  if (description) parts.push(`Description: ${description}`);
  if (transcript) parts.push(`Transcript:\n${transcript}`);
  const content = parts.join('\n\n') || `YouTube video ${id} (no transcript or description available)`;
  return { type: 'youtube', title: title || `YouTube video ${id}`, content: content.slice(0, 50000) };
}

async function fetchArticle(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  const html = await r.text();
  const title = extractTitle(html, url);
  const text = htmlToText(html);
  return { type: 'article', title, content: text.slice(0, 50000) };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const url = (body?.url || '').trim();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) return Response.json({ error: 'URL must start with http:// or https://' }, { status: 400 });

    const ytId = extractYouTubeId(url);
    const result = ytId ? await fetchYouTube(ytId) : await fetchArticle(url);
    return Response.json({ ...result, source_url: url });
  } catch (error) {
    console.error('fetchUrlContent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}