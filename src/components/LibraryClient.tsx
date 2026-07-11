"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MovieModal } from "./MovieModal";
import { TvShowModal } from "./TvShowModal";
import { motion } from "framer-motion";

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
  const [locallyWatched, setLocallyWatched] = useState<string[]>([]);
  const [localShows, setLocalShows] = useState<any[]>(trackedShows);
  const [showsPage, setShowsPage] = useState(1);
  const [isLoadingMoreShows, setIsLoadingMoreShows] = useState(false);
  const [hasMoreShows, setHasMoreShows] = useState(showsPagination.currentPage < showsPagination.totalPages);
  const [watchNextLimit, setWatchNextLimit] = useState(5);

  useEffect(() => {
    setLocalShows(trackedShows);
    setShowsPage(1);
    setHasMoreShows(showsPagination.currentPage < showsPagination.totalPages);
  }, [trackedShows, showsPagination]);

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
    const key = `${ep.showId}-${ep.seasonNumber}-${ep.episodeNumber}`;
    const isChecked = locallyWatched.includes(key);

    if (isChecked) {
      setIsMarking(key);
      try {
        const res = await fetch("/api/tv/episodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: ep.tmdbId,
            showTitle: ep.showTitle,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            isWatched: false,
          }),
        });
        if (res.ok) {
          setLocallyWatched((prev) => prev.filter((k) => k !== key));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsMarking(null);
      }
    } else {
      setIsMarking(key);
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
          setLocallyWatched((prev) => [...prev, key]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsMarking(null);
      }
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
      className="relative h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12"
    >
      <section className="relative overflow-hidden px-6 pb-12 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#ffcc00] blur-[100px] mix-blend-screen" />
        </div>

        <div className="relative z-10 mx-auto mt-4 md:mt-12 flex max-w-7xl flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
          <div className="flex-1 text-center md:text-left">
            <h2 className="mb-2 font-headline-lg text-[28px] md:text-headline-lg text-[#ffedc3] drop-shadow-lg">
              Your Library
            </h2>
            <p className="max-w-2xl font-body-md md:font-body-lg text-[13px] md:text-body-lg text-zinc-400">
              Manage your watchlist, tracked TV series, and see recommendations for what to watch next.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-12 px-4 md:px-12 pb-28 md:pb-24">
        {/* Watch Next Section */}
        <div>
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
              <span className="material-symbols-outlined text-[32px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_circle
              </span>
              Watch Next
            </h3>
            <span className="font-label-sm text-[12px] font-bold uppercase text-[#00daf3]">
              Up Next & Watchlist
            </span>
          </div>

          {watchNextEpisodes.length === 0 && watchlistMovies.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">smart_display</span>
              <p>Nothing in Watch Next. Start watching TV shows or save movies to watchlist!</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* TV Watch Next */}
              {watchNextEpisodes.length > 0 && (
                <div className="space-y-4 lg:col-span-7">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-1">TV Shows (New Episodes)</h4>
                  <div className="space-y-4">
                    {watchNextEpisodes.slice(0, watchNextLimit).map((ep) => {
                      const airDate = ep.air_date ? new Date(ep.air_date) : null;
                      const isNew = airDate && (Date.now() - airDate.getTime()) < (7 * 24 * 60 * 60 * 1000) && airDate.getTime() <= Date.now();
                      const isPremiere = ep.episodeNumber === 1;
                      const key = `${ep.showId}-${ep.seasonNumber}-${ep.episodeNumber}`;
                      const isMarkingThis = isMarking === key;
                      const isChecked = locallyWatched.includes(key);

                      return (
                        <div
                          key={ep.showId}
                          onClick={() => setSelectedTvShowId(ep.tmdbId)}
                          className={`glass-panel flex overflow-hidden rounded-2xl border border-white/10 hover:border-yellow-400/30 hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] active:bg-white/5 transition-all duration-300 group touch-manipulation relative ${
                            isChecked ? "opacity-30 border-emerald-500/20 bg-emerald-950/5 scale-[0.99] hover:scale-[0.99]" : ""
                          }`}
                        >
                          {/* Left: Image spanning to top, bottom and left borders */}
                          <div className="w-28 md:w-44 shrink-0 relative bg-zinc-950 self-stretch min-h-[110px] md:min-h-[130px]">
                            {ep.still_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                alt={ep.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <span className="material-symbols-outlined">tv</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Right: Padding containing Details & Action */}
                          <div className="flex-1 min-w-0 p-3 md:p-5 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="border border-white/10 bg-white/5 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider hover:bg-white/10 hover:text-white transition-colors">
                                  {ep.showTitle} ›
                                </span>
                              </div>
                              
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-white text-base md:text-xl font-[family-name:var(--font-bricolage-grotesque)] font-extrabold tracking-tight">
                                  S{ep.seasonNumber.toString().padStart(2, '0')} | E{ep.episodeNumber.toString().padStart(2, '0')}
                                </span>
                                {ep.remainingCount > 0 && (
                                  <span className="text-zinc-500 text-xs font-semibold">
                                    +{ep.remainingCount}
                                  </span>
                                )}
                              </div>
                              
                              <span className="text-zinc-400 text-xs md:text-sm font-semibold truncate group-hover:text-yellow-300 transition-colors">
                                {ep.name}
                              </span>
                              
                              <div className="flex gap-1.5 mt-1">
                                {isNew && (
                                  <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black"></span>
                                    </span>
                                    NEW
                                  </span>
                                )}
                                {isPremiere && (
                                  <span className="bg-white/10 border border-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    PREMIERE
                                  </span>
                                )}
                              </div>
                            </div>

                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkWatched(ep);
                              }}
                              disabled={isMarkingThis}
                              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shrink-0 shadow-lg ${
                                isChecked
                                  ? "bg-emerald-500 border-transparent text-white scale-110"
                                  : isMarkingThis
                                    ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
                                    : "bg-white border-transparent text-zinc-950 hover:bg-zinc-100"
                              }`}
                              initial={{ scale: 1 }}
                              animate={isChecked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                              transition={{ duration: 0.3 }}
                              aria-label="Mark as watched"
                            >
                              {isMarkingThis ? (
                                <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></div>
                              ) : isChecked ? (
                                <motion.span 
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="material-symbols-outlined text-[20px] font-black"
                                >
                                  check
                                </motion.span>
                              ) : (
                                <span className="material-symbols-outlined text-[20px] font-black">check</span>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {watchNextEpisodes.length > watchNextLimit && (
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
              {watchlistMovies.length > 0 && (
                <div className={`space-y-4 ${watchNextEpisodes.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-1">Watchlist Movies</h4>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    {watchlistMovies.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMovie(m)}
                        className="w-28 md:w-36 shrink-0 flex flex-col gap-2 cursor-pointer group touch-manipulation"
                      >
                        <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shadow-xl relative">
                          {m.poster_path ? (
                            <img
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
                        <img
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

              {/* Ratings Pagination Controls */}
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
                          <img
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

              {/* TV Shows Pagination loading spinner */}
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
