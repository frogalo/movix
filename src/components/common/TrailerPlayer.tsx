"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TrailerVideo = {
  id: string;
  key: string;
  name: string;
  type: string;
  official: boolean;
};

interface TrailerPlayerProps {
  movieId: number | string;
  movieTitle: string;
  isOpen: boolean;
  onClose: () => void;
  mediaType?: "movie" | "tv";
}

export function TrailerPlayer({
  movieId,
  movieTitle,
  isOpen,
  onClose,
  mediaType = "movie",
}: TrailerPlayerProps) {
  const [videos, setVideos] = useState<TrailerVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch trailers when opened
  useEffect(() => {
    if (!isOpen || !movieId) return;

    setIsLoading(true);
    setError(null);
    setActiveIndex(0);

    const apiPath = mediaType === "tv" ? `/api/tv/${movieId}/videos` : `/api/movies/${movieId}/videos`;

    fetch(apiPath)
      .then((res) => res.json())
      .then((data) => {
        if (data.videos?.length) {
          setVideos(data.videos);
        } else {
          setError("No trailers available for this title.");
          setVideos([]);
        }
      })
      .catch(() => setError("Failed to load trailers. Please try again."))
      .finally(() => setIsLoading(false));
  }, [isOpen, movieId, mediaType]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setVideos([]);
      setError(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  const activeVideo = videos[activeIndex] ?? null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 flex w-full max-w-5xl flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Official Trailer
                </span>
                <h2 className="text-lg font-bold text-white leading-tight md:text-xl">
                  {movieTitle}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close trailer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/15"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Video Player */}
            <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
              <div className="aspect-video w-full">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-primary-container" />
                      <p className="text-sm text-zinc-400">Loading trailer…</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-900 p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-zinc-600">
                      videocam_off
                    </span>
                    <p className="text-sm text-zinc-400">{error}</p>
                  </div>
                ) : activeVideo ? (
                  <iframe
                    ref={iframeRef}
                    key={activeVideo.key}
                    src={`https://www.youtube.com/embed/${activeVideo.key}?autoplay=1&rel=0&modestbranding=1&color=white`}
                    title={activeVideo.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : null}
              </div>
            </div>

            {/* Trailer Selector — only shown when there are multiple */}
            {videos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => setActiveIndex(index)}
                    className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      index === activeIndex
                        ? "border-primary-container bg-primary-container/20 text-primary-container"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {index === activeIndex ? "pause_circle" : "play_circle"}
                    </span>
                    <span className="max-w-[180px] truncate">{video.name}</span>
                    {video.official && (
                      <span className="ml-1 rounded-full bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-300">
                        Official
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
