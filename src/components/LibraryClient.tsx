"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MovieModal } from "./MovieModal";
import { TvShowModal } from "./TvShowModal";

import { ImageWithLoader } from "./ImageWithLoader";

type LibraryEntry = {
  movieId: number;
  rating?: number;
};

type LibraryClientProps = {
  watchlistMovies: any[];
  watchNextEpisodes: any[];
  ratedMovies: any[];
  trackedShows: any[];
  userLibrary: { watchlists: LibraryEntry[]; ratings: LibraryEntry[] };
  ratingsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  showsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
};

export function LibraryClient({
  watchlistMovies,
  watchNextEpisodes,
  ratedMovies,
  trackedShows,
  userLibrary,
  ratingsPagination,
  showsPagination,
}: LibraryClientProps) {
  const router = useRouter();
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [selectedTvShowId, setSelectedTvShowId] = useState<number | null>(null);
  const [isMarking, setIsMarking] = useState<string | null>(null);
  const [finishedShows, setFinishedShows] = useState<any[]>([]);
  const [localWatchNext, setLocalWatchNext] = useState<any[]>(watchNextEpisodes);
  const [localShows, setLocalShows] = useState<any[]>(trackedShows);
  const [showsPage, setShowsPage] = useState(1);
  const [isLoadingMoreShows, setIsLoadingMoreShows] = useState(false);
  const [hasMoreShows, setHasMoreShows] = useState(showsPagination.currentPage < showsPagination.totalPages);
  const [watchNextLimit, setWatchNextLimit] = useState(5);

  const filteredWatchlistMovies = watchlistMovies.filter(
    (m) => !userLibrary.ratings.some((r) => r.movieId === m.id)
  );

  useEffect(() => {
    setLocalShows(trackedShows);
    setShowsPage(1);
    setHasMoreShows(showsPagination.currentPage < showsPagination.totalPages);
  }, [trackedShows, showsPagination]);

  useEffect(() => {
    setLocalWatchNext(watchNextEpisodes);
  }, [watchNextEpisodes]);

  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;
      if (scrollHeight - scrollTop <= clientHeight + 250) {
        loadMoreShows();
      }
    };
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreShows, isLoadingMoreShows, showsPage]);

  const loadMoreShows = async () => {
    if (isLoadingMoreShows || !hasMoreShows) return;
    setIsLoadingMoreShows(true);
    const nextPage = showsPage + 1;
    try {
      const res = await fetch(`/api/user/library/shows?page=${nextPage}`);
      if (res.ok) {
        const data = await res.json();
        setLocalShows((prev) => {
          const newShows = data.shows.filter((newS: any) => !prev.some((s) => s.id === newS.id));
          return [...prev, ...newShows];
        });
        setShowsPage(nextPage);
        setHasMoreShows(nextPage < data.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMoreShows(false);
    }
  };

  const handleLibraryUpdate = () => {
    router.refresh();
  };

  const handleMarkWatched = async (ep: any) => {
    const showId = ep.showId;
    if (isMarking === showId) return;
    setIsMarking(showId);
    try {
      const res = await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: ep.tmdbId,
          showTitle: ep.showTitle,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          isWatched: true,
        }),
      });
      if (res.ok) {
        if (ep.remainingCount === 0) {
          setLocalWatchNext((prev) => prev.filter((e) => e.showId !== showId));
          setFinishedShows((prev) => [...prev, ep]);
        } else {
          const nextRes = await fetch(`/api/tv/watch-next?showId=${showId}`);
          if (nextRes.ok) {
            const nextEp = await nextRes.json();
            if (nextEp) {
              setLocalWatchNext((prev) => prev.map((e) => e.showId === showId ? nextEp : e));
            } else {
              setLocalWatchNext((prev) => prev.filter((e) => e.showId !== showId));
            }
          } else {
            setLocalWatchNext((prev) => prev.filter((e) => e.showId !== showId));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMarking(null);
    }
  };

  const setPage = (type: "ratings" | "shows", pageNum: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set(`${type}Page`, pageNum.toString());
    router.push(`/library?${params.toString()}`);
  };

  return (
    <main
      onScroll={(e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 250) {
          loadMoreShows();
        }
      }}
      className="relative h-screen min-w-0 max-w-full overflow-x-hidden overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12"
    >
      <section className="mx-auto max-w-[1600px] space-y-12 px-4 pt-24 md:px-12 md:pt-12 pb-28 md:pb-24">
        {/* Watch Next Section */}
        <div>
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
              <span className="material-symbols-outlined text-[32px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_circle
              </span>
              Watch Next
            </h3>
          </div>

          {localWatchNext.length === 0 && filteredWatchlistMovies.length === 0 ? (
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
                                    {ep.episodeNumber === 1 && (
                                      <span className="bg-white/10 border border-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                        PREMIERE
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
                    {filteredWatchlistMovies.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMovie(m)}
                        className="w-28 md:w-full shrink-0 md:shrink flex flex-col gap-2 cursor-pointer group touch-manipulation"
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
                        </div>
                        <h5 className="text-white text-xs font-semibold truncate px-1 group-hover:text-yellow-400" title={m.title}>
                          {m.title}
                        </h5>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Your Ratings Section */}
        <div>
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
              <span className="material-symbols-outlined text-[32px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              Your Movie Ratings
            </h3>
            <span className="font-label-sm text-[12px] font-bold uppercase text-yellow-400">
              {ratingsPagination.totalItems} Ratings
            </span>
          </div>

          {ratedMovies.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">star_rate</span>
              <p>You haven't rated any movies yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {ratedMovies.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMovie(m)}
                    className="group flex cursor-pointer flex-col gap-2 rounded-2xl bg-zinc-900/40 p-2.5 border border-white/5 hover:border-yellow-400/20 transition duration-300 touch-manipulation"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-950 border border-white/5 shadow-xl">
                      {m.poster_path ? (
                        <ImageWithLoader
                          src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                          alt={m.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <span className="material-symbols-outlined">movie</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border border-white/10">
                        <span className="material-symbols-outlined text-[12px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-xs font-bold text-white">{m.userRating}/10</span>
                      </div>
                    </div>
                    <h4 className="text-white text-xs font-semibold truncate px-1" title={m.title}>
                      {m.title}
                    </h4>
                  </div>
                ))}
              </div>

              {ratingsPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    disabled={ratingsPagination.currentPage === 1}
                    onClick={() => setPage("ratings", ratingsPagination.currentPage - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-800 transition touch-manipulation"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="text-sm font-semibold text-zinc-400 px-2">
                    Page {ratingsPagination.currentPage} of {ratingsPagination.totalPages}
                  </span>
                  <button
                    disabled={ratingsPagination.currentPage === ratingsPagination.totalPages}
                    onClick={() => setPage("ratings", ratingsPagination.currentPage + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-800 transition touch-manipulation"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tracked TV Shows Section */}
        <div>
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
              <span className="material-symbols-outlined text-[32px] text-purple-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                live_tv
              </span>
              Tracked TV Shows
            </h3>
            <span className="font-label-sm text-[12px] font-bold uppercase text-purple-400">
              {showsPagination.totalItems} Shows
            </span>
          </div>

          {localShows.length === 0 ? (
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
                      className="group flex cursor-pointer flex-col gap-2 rounded-2xl bg-zinc-900/40 p-2.5 border border-white/5 hover:border-purple-500/30 transition duration-300 touch-manipulation"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-950 border border-white/5 shadow-xl">
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
                        <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/85 backdrop-blur-md px-2 py-1 text-center border border-white/5">
                          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                            {watchedCount} watched
                          </p>
                        </div>
                      </div>
                      <h4 className="text-white text-xs font-semibold truncate px-1" title={show.title}>
                        {show.title}
                      </h4>
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
      </section>

      {/* Movie Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        userLibrary={userLibrary}
        onLibraryUpdate={handleLibraryUpdate}
      />

      {/* TV Show Modal */}
      <TvShowModal
        showId={selectedTvShowId}
        isOpen={!!selectedTvShowId}
        onClose={() => setSelectedTvShowId(null)}
        onLibraryUpdate={handleLibraryUpdate}
      />
    </main>
  );
}
