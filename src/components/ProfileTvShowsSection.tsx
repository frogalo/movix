"use client";

import { useState, useEffect } from "react";
import { TvShowModal } from "./TvShowModal";
import { ImageWithLoader } from "./ImageWithLoader";

type Episode = {
  id: string;
  isWatched: boolean;
};

type TvShow = {
  id: string;
  tvdbId: number;
  tmdbId: number | null;
  title: string;
  status: string;
  isFavorite: boolean;
  posterPath: string | null;
  backdropPath: string | null;
  episodes: Episode[];
  updatedAt: string;
};

interface ProfileTvShowsSectionProps {
  initialTvShows: TvShow[];
}

export function ProfileTvShowsSection({ initialTvShows }: ProfileTvShowsSectionProps) {
  const [tvShows, setTvShows] = useState<TvShow[]>(initialTvShows);
  const [selectedShowId, setSelectedShowId] = useState<string | number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Progressive resolution of missing poster paths
  useEffect(() => {
    const showsToResolve = tvShows.filter((s) => !s.posterPath);
    if (showsToResolve.length === 0) return;

    let isMounted = true;

    async function resolvePosters() {
      // Process sequentially with a small delay
      for (const show of showsToResolve) {
        if (!isMounted) break;
        try {
          const res = await fetch(`/api/tv/${show.tvdbId}?season=1`);
          if (res.ok) {
            const data = await res.json();
            const posterPath = data.details?.poster_path;
            const backdropPath = data.details?.backdrop_path;
            if (posterPath) {
              setTvShows((prev) =>
                prev.map((s) =>
                  s.id === show.id
                    ? { ...s, posterPath, backdropPath }
                    : s
                )
              );
            }
          }
          // Sleep for 150ms to rate-limit and prevent server spam
          await new Promise((r) => setTimeout(r, 150));
        } catch (e) {
          console.error("Failed to resolve poster for:", show.title, e);
        }
      }
    }

    resolvePosters();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvShows.length]);

  const fetchTvShows = async () => {
    try {
      const res = await fetch("/api/tv");
      if (res.ok) {
        const data = await res.json();
        setTvShows(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportMessage("Importing TV Time export file. This might take a few seconds...");

    try {
      const res = await fetch("/api/user/import-tvtime", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setImportMessage(
          `Successfully imported ${data.showsCount} shows and ${data.episodesCount} watched episodes!`
        );
        fetchTvShows();
      } else {
        const errText = await res.text();
        setImportMessage(`Import failed: ${errText}`);
      }
    } catch (e: any) {
      setImportMessage(`Import error: ${e.message || e}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleShowClick = (show: TvShow) => {
    setSelectedShowId(show.id);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 mt-12">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end">
        <div>
          <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
            <span className="material-symbols-outlined text-[32px] text-purple-400" style={{ fontVariationSettings: "'FILL' 1" }}>
              live_tv
            </span>
            Tracked TV Shows
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Keep track and vote for episodes of your favorite TV series.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 md:px-5 md:py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-purple-500 disabled:opacity-50 touch-manipulation"
          >
            <span className="material-symbols-outlined text-[16px]">publish</span>
            {isImporting ? "Importing..." : "Import TV Time Data"}
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-sm text-purple-300">
          {importMessage}
        </div>
      )}

      {tvShows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">tv</span>
          <p className="mb-4">You are not tracking any TV shows yet.</p>
          <p className="text-xs text-zinc-500">
            Use the search bar at the top to find and track TV shows, or import your TV Time history.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tvShows.map((show) => {
            const watchedCount = show.episodes.filter((e) => e.isWatched).length;
            const posterUrl = show.posterPath
              ? `https://image.tmdb.org/t/p/w342${show.posterPath}`
              : null;

            return (
              <div
                key={show.id}
                onClick={() => handleShowClick(show)}
                className="group flex cursor-pointer flex-col gap-2 rounded-2xl bg-zinc-900/40 p-2.5 border border-white/5 hover:border-purple-500/30 transition duration-300 touch-manipulation"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-950 border border-white/5">
                  {posterUrl ? (
                    <ImageWithLoader
                      src={posterUrl}
                      alt={show.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loaderSize={40}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                      <span className="material-symbols-outlined text-3xl text-zinc-700 mb-2">tv</span>
                      <span className="text-xs font-semibold text-zinc-500 break-words line-clamp-3 w-full">
                        {show.title}
                      </span>
                    </div>
                  )}

                  {show.isFavorite && (
                    <div className="absolute right-2 top-2 rounded-lg bg-black/60 backdrop-blur-md p-1 border border-white/10 text-yellow-400">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        favorite
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-1 py-0.5">
                  <h4
                    className="truncate text-xs font-semibold text-white group-hover:text-purple-300 transition-colors"
                    title={show.title}
                  >
                    {show.title}
                  </h4>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {watchedCount} episodes watched
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TvShowModal
        showId={selectedShowId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLibraryUpdate={fetchTvShows}
      />
    </div>
  );
}
