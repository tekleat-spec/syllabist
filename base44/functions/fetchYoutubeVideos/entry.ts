import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    const query = 'student motivation education perseverance academic success';

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=27&maxResults=6&relevanceLanguage=en&safeSearch=strict&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error('YouTube API error:', JSON.stringify(data));
      return Response.json({ error: data.error?.message || 'YouTube API error' }, { status: 500 });
    }

    const videos = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    }));

    return Response.json({ videos });
  } catch (error) {
    console.error('fetchYoutubeVideos error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});