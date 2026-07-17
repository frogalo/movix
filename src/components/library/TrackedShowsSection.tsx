"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

interface TrackedShowsSectionProps {
  localShows: any[];
  showsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  } | null;
  isLoadingMoreShows: boolean;
  setSelectedTvShowId: (id: number) => void;
  loading?: boolean;
}

export function TrackedShowsSection({
  localShows,
  showsPagination,
  isLoadingMoreShows,
  setSelectedTvShowId,
  loading = false,
}: TrackedShowsSectionProps) {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
        <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
          <span className="material-symbols-outlined text-[32px] text-purple-400" style={{ fontVariationSettings: "'FILL' 1" }}>
            live_tv
          </span>
          Tracked TV Shows
        </h3>
        <span className="font-label-sm text-[12px] font-bold uppercase text-purple-400">
          {loading ? "Loading..." : `${showsPagination?.totalItems || 0} Shows`}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 animate-pulse">
              <div className="aspect-[2/3] w-full bg-zinc-850" />
              <div className="flex flex-col gap-2 p-3 pt-2 pb-3.5">
                <div className="h-3 bg-zinc-850 rounded w-2/3" />
                <div className="flex gap-2">
                  <div className="h-4 bg-zinc-850 rounded-lg w-12" />
                  <div className="h-4 bg-zinc-850 rounded-lg w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : localShows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">tv</span>
          <p>You are not tracking any TV shows yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {localShows.map((show) => {
              const watchedCount = show.episodes?.filter((e: any) => e.isWatched).length || 0;
              const posterUrl = show.posterPath
                ? `https://image.tmdb.org/t/p/w342${show.posterPath}`
                : null;
              return (
                <div
                  key={show.id}
                  onClick={() => setSelectedTvShowId(show.tmdbId)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-purple-500/30 transition duration-300 touch-manipulation"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950 border-b border-white/5 shadow-xl">
                    {posterUrl ? (
                      <ImageWithLoader
                        src={posterUrl}
                        alt={show.title}
                        className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-700">
                        <span className="material-symbols-outlined text-4xl">tv</span>
                      </div>
                    )}

                    {/* Rating / Reaction overlay in corner */}
                    {(show.rating || show.vote) && (
                      <div className="absolute right-2 top-2 rounded-lg bg-black/85 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-white border border-white/10 flex items-center gap-1 shadow-lg z-10">
                        {show.vote && (
                          <span>
                            {show.vote === "love" && "😍"}
                            {show.vote === "good" && "😄"}
                            {show.vote === "wow" && "😮"}
                            {show.vote === "sad" && "😢"}
                            {show.vote === "angry" && "😡"}
                            {show.vote === "funny" && "😂"}
                          </span>
                        )}
                        {show.rating && (
                          <span className="flex items-center gap-0.5 text-yellow-400 font-extrabold">
                            <span className="material-symbols-outlined text-[10px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {show.rating}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 p-3 pt-2 pb-3.5">
                    <h4 className="text-white text-xs font-semibold truncate" title={show.title}>
                      {show.title}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      <div className="rounded-lg bg-black/80 backdrop-blur-md px-2 py-1 text-center border border-white/5">
                        <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">
                          {watchedCount} watched
                        </p>
                      </div>
                      {show.totalEpisodes > 0 && (
                        show.totalEpisodes - watchedCount > 0 ? (
                          <div className="rounded-lg bg-purple-500/10 backdrop-blur-md px-2 py-1 text-center border border-purple-500/20">
                            <p className="text-[9px] font-bold text-purple-300 uppercase tracking-wider">
                              {show.totalEpisodes - watchedCount} unwatched
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-emerald-500/10 backdrop-blur-md px-2 py-1 text-center border border-emerald-500/20">
                            <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
                              Fully Watched
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isLoadingMoreShows && (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-purple-500"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
