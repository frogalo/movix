"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

interface WatchNextSectionProps {
  localWatchNext: any[];
  finishedShows: any[];
  filteredWatchlistMovies: any[];
  watchNextLimit: number;
  setWatchNextLimit: React.Dispatch<React.SetStateAction<number>>;
  isMarking: string | null;
  handleMarkWatched: (ep: any) => Promise<void>;
  setSelectedTvShowId: (id: number) => void;
  setSelectedMovie: (movie: any) => void;
  loading?: boolean;
}

function getReleaseStatus(releaseDateStr?: string) {
  if (!releaseDateStr) return null;

  const parts = releaseDateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const releaseDate = new Date(year, month, day);

  const diffTime = releaseDate.getTime() - todayLocal.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      text: "premiere",
      type: "premiere"
    };
  } else if (diffDays > 0) {
    if (diffDays < 10) {
      return {
        text: `in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
        type: "soon"
      };
    } else {
      const formattedDate = releaseDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      return {
        text: formattedDate,
        type: "future"
      };
    }
  } else {
    const pastDays = Math.abs(diffDays);
    if (pastDays < 10) {
      return {
        text: `premiere ${pastDays} day${pastDays > 1 ? 's' : ''} ago`,
        type: "recent"
      };
    } else {
      return {
        text: "available",
        type: "available"
      };
    }
  }
}

export function WatchNextSection({
  localWatchNext,
  finishedShows,
  filteredWatchlistMovies,
  watchNextLimit,
  setWatchNextLimit,
  isMarking,
  handleMarkWatched,
  setSelectedTvShowId,
  setSelectedMovie,
  loading = false,
}: WatchNextSectionProps) {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
        <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
          <span className="material-symbols-outlined text-[32px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
            play_circle
          </span>
          Watch Next
        </h3>
      </div>

      {loading ? (
        <div className="grid min-w-0 max-w-full gap-6 lg:grid-cols-12">
          {/* TV Watch Next Skeleton */}
          <div className="space-y-4 w-full min-w-0 lg:col-span-8">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-1">TV Shows (New Episodes)</h4>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="glass-panel flex w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 h-[110px] md:h-[130px] animate-pulse bg-zinc-900/40">
                  <div className="w-28 md:w-44 shrink-0 bg-zinc-850" />
                  <div className="flex-1 p-3 md:p-5 flex flex-col justify-center space-y-3">
                    <div className="h-4 bg-zinc-850 rounded w-1/3" />
                    <div className="h-3 bg-zinc-850 rounded w-2/3" />
                    <div className="h-3 bg-zinc-850 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Movie Watchlist Skeleton */}
          <div className="space-y-4 w-full min-w-0 lg:col-span-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-1">Watchlist Movies</h4>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl bg-zinc-900/40 p-2 border border-white/5 animate-pulse">
                  <div className="aspect-[2/3] w-full bg-zinc-850 rounded-xl" />
                  <div className="h-3 bg-zinc-850 rounded w-2/3 mx-auto mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : localWatchNext.length === 0 && filteredWatchlistMovies.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">smart_display</span>
          <p>Nothing in Watch Next. Start watching TV shows or save movies to watchlist!</p>
        </div>
      ) : (
        <div className="grid min-w-0 max-w-full gap-6 lg:grid-cols-12">
          {/* TV Watch Next */}
          {localWatchNext.length > 0 && (
            <div className={`space-y-4 w-full min-w-0 ${filteredWatchlistMovies.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-1">TV Shows (New Episodes)</h4>
              <div className="space-y-4 overflow-hidden py-1 px-1">
                {[
                  ...finishedShows.map((ep: any) => ({ showId: ep.showId, ep, isFinished: true })),
                  ...localWatchNext
                    .filter((we: any) => !finishedShows.some((fs: any) => fs.showId === we.showId))
                    .map((ep: any) => ({ showId: ep.showId, ep, isFinished: false }))
                ].slice(0, watchNextLimit).map(({ showId, ep, isFinished }: { showId: string; ep: any; isFinished: boolean }) => {
                  const isMarkingThis = isMarking === showId;
                  return (
                    <div key={showId}>
                      {isFinished ? (
                        <div className="glass-panel flex w-full min-w-0 flex-col items-center justify-center rounded-2xl border border-yellow-400/50 bg-yellow-950/20 p-6 md:p-8 text-center shadow-[0_0_30px_rgba(250,204,21,0.2)] relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent pointer-events-none" />
                          <span className="material-symbols-outlined text-[48px] md:text-[64px] text-yellow-400 mb-4 animate-bounce">verified</span>
                          <h4 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg">Congratulations!</h4>
                          <p className="text-sm md:text-base text-zinc-300 max-w-[80%] mx-auto">
                            You've finished watching <span className="font-bold text-white">{ep.showTitle}</span>.
                          </p>
                          <div className="flex gap-8 mt-6">
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-black text-yellow-400 drop-shadow-md">{ep.totalEpisodesWatched + 1}</span>
                              <span className="text-[10px] md:text-xs uppercase font-bold text-zinc-500 tracking-widest mt-1">Episodes</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-black text-emerald-400 drop-shadow-md">{Math.round(((ep.totalWatchTimeMinutes || 0) + 45) / 60)}</span>
                              <span className="text-[10px] md:text-xs uppercase font-bold text-zinc-500 tracking-widest mt-1">Hours</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setSelectedTvShowId(ep.tmdbId)}
                          className="glass-panel flex w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 hover:border-yellow-400/30 hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] active:bg-white/5 transition-all duration-300 group touch-manipulation cursor-pointer"
                        >
                          {/* Left: Image */}
                          <div className="w-28 md:w-44 shrink-0 relative bg-zinc-950 self-stretch min-h-[110px] md:min-h-[130px] overflow-hidden">
                            {ep.still_path ? (
                              <ImageWithLoader
                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                alt={ep.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <span className="material-symbols-outlined">tv</span>
                              </div>
                            )}
                          </div>

                          {/* Right: Details & Action */}
                          <div className="flex-1 min-w-0 p-3 md:p-5 flex items-center justify-between gap-2 md:gap-4">
                            <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
                              <div className="flex flex-wrap gap-2 items-center min-w-0">
                                <span className="border border-white/10 bg-white/5 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider hover:bg-white/10 hover:text-white transition-colors truncate max-w-full block">
                                  {ep.showTitle} ›
                                </span>
                              </div>

                              <div className="flex items-baseline gap-1.5 mt-0.5 min-w-0">
                                <span className="text-white text-base md:text-xl font-[family-name:var(--font-bricolage-grotesque)] font-extrabold tracking-tight shrink-0">
                                  S{ep.seasonNumber.toString().padStart(2, '0')} | E{ep.episodeNumber.toString().padStart(2, '0')}
                                </span>
                                {ep.remainingCount > 0 && (
                                  <span className="text-zinc-500 text-xs font-semibold shrink-0">
                                    +{ep.remainingCount}
                                  </span>
                                )}
                              </div>

                              <span className="text-zinc-400 text-xs md:text-sm font-semibold truncate block w-full group-hover:text-yellow-300 transition-colors">
                                {ep.name}
                              </span>

                              <div className="flex gap-1.5 mt-1">
                                {ep.isNew && !ep.isFuture && (
                                  <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(250,204,21,0.5)] shrink-0">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black"></span>
                                    </span>
                                    NEW
                                  </span>
                                )}
                                {ep.isFuture && (
                                  <span className="bg-[#00daf3] text-black text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(0,218,243,0.5)] shrink-0">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black"></span>
                                    </span>
                                    SOON
                                  </span>
                                )}
                              </div>
                            </div>

                            {ep.isFuture ? (
                              <div className="flex flex-col items-center justify-center bg-black/40 border border-yellow-400/30 rounded-xl px-3 py-2 shrink-0">
                                <span className="text-yellow-400 font-black text-lg md:text-xl">{ep.daysUntil}</span>
                                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Days</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkWatched(ep);
                                }}
                                disabled={isMarkingThis}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-lg ${
                                  isMarkingThis
                                    ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
                                    : "bg-white border-transparent text-zinc-950 hover:bg-zinc-100"
                                }`}
                                aria-label="Mark as watched"
                              >
                                {isMarkingThis ? (
                                  <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                  <span className="material-symbols-outlined text-[20px] font-black">check</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {localWatchNext.length > watchNextLimit && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWatchNextLimit((prev) => prev + 5);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                      Load More Episodes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Movies Watchlist */}
          {filteredWatchlistMovies.length > 0 && (
            <div className={`space-y-4 min-w-0 w-full ${localWatchNext.length > 0 ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-1">Watchlist Movies</h4>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:mx-0 md:px-0">
                {filteredWatchlistMovies.map((m) => {
                  const status = getReleaseStatus(m.release_date);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMovie(m)}
                      className="w-28 md:w-full shrink-0 md:shrink flex flex-col gap-1 cursor-pointer group touch-manipulation"
                    >
                      <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shadow-xl relative">
                        {m.poster_path ? (
                          <ImageWithLoader
                            src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                            alt={m.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <span className="material-symbols-outlined">movie</span>
                          </div>
                        )}

                        {status && (
                          <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/40 to-transparent h-10 pointer-events-none" />
                            <div className="relative flex items-center justify-center gap-1.5 py-1.5 px-2">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                status.type === 'premiere' ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' :
                                status.type === 'soon' ? 'bg-[#00daf3] shadow-[0_0_8px_#00daf3]' :
                                status.type === 'future' ? 'bg-zinc-400' :
                                status.type === 'recent' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' :
                                'bg-zinc-500'
                              } ${status.type === 'premiere' ? 'animate-pulse' : ''}`} />
                              <span className="text-[8px] font-extrabold tracking-widest uppercase text-white/95 drop-shadow">
                                {status.text}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <h5 className="text-white text-xs font-semibold truncate px-1 group-hover:text-yellow-400" title={m.title}>
                        {m.title}
                      </h5>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
