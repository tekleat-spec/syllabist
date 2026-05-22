import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Play, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MotivationalVideos() {
  const [activeVideo, setActiveVideo] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['motivational-videos'],
    queryFn: () => base44.functions.invoke('fetchYoutubeVideos', {}).then(r => r.data),
    staleTime: 1000 * 60 * 60, // cache for 1 hour
  });

  const videos = data?.videos || [];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Youtube className="w-5 h-5 text-red-500" />
        <h2 className="font-semibold text-foreground">Stay Motivated</h2>
        <span className="text-xs text-muted-foreground ml-1">· Educational &amp; Perseverance</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-video" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No videos available right now.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {videos.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl overflow-hidden border border-border bg-card cursor-pointer group"
              onClick={() => setActiveVideo(activeVideo === v.id ? null : v.id)}
            >
              {activeVideo === v.id ? (
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                    title={v.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video relative">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 rounded-full p-2.5 shadow">
                      <Play className="w-5 h-5 text-gray-900 fill-gray-900" />
                    </div>
                  </div>
                </div>
              )}
              <div className="px-3 py-2.5">
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{v.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{v.channel}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}