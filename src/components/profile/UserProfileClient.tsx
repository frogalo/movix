"use client";

import { useState, useEffect } from "react";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";
import { formatTvStatus } from "@/lib/format-status";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";

export type RatedMovie = {
  movieId: number;
  rating: number | null;
  vote: string | null;
  updatedAt: string | Date;
  title?: string;
  posterPath?: string | null;
};

export type WatchedEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  watchedAt: string | Date | null;
  show: {
    id?: string;
    tvdbId?: number;
    tmdbId?: number | null;
    title: string;
    posterPath: string | null;
  };
};

export type TrackedShow = {
  id: string;
  tvdbId: number;
  tmdbId: number | null;
  title: string;
  status: string;
  isFavorite: boolean;
  posterPath: string | null;
  backdropPath?: string | null;
  rating: number | null;
  vote: string | null;
  watchedCount?: number;
};

import { Movie } from "@/components/home/TrendingMoviesCarousel";

type LibraryEntry = {
  movieId: number;
  rating?: number | null;
};

interface UserProfileClientProps {
  userId: string;
  ratingsData: RatedMovie[];
  movieInfoMap: Record<number, { posterPath: string | null; title: string }>;
  watchedEpisodesData: WatchedEpisode[];
  initialTvShows: TrackedShow[];
  totalTvShowsCount: number;
}

export function UserProfileClient({
  userId,
  ratingsData,
  movieInfoMap,
  watchedEpisodesData,
  initialTvShows,
  totalTvShowsCount,
}: UserProfileClientProps) {
  // Modal states
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const [selectedShowId, setSelectedShowId] = useState<string | number | null>(null);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);

  // User library for MovieModal actions
  const [userLibrary, setUserLibrary] = useState<{ watchlists: LibraryEntry[]; ratings: LibraryEntry[] }>({
    watchlists: [],
    ratings: [],
  });

  const fetchUserLibrary = async () => {
    try {
      const res = await fetch("/api/user/library");
      if (res.ok) {
        const data = await res.json();
        setUserLibrary({
          watchlists: data.watchlists || [],
          ratings: data.ratings || [],
        });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchUserLibrary();
  }, []);

  // Tracked shows pagination state
  const [tvShows, setTvShows] = useState<TrackedShow[]>(initialTvShows);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialTvShows.length < totalTvShowsCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleMovieClick = (movieId: number) => {
    const info = movieInfoMap[movieId];
    setSelectedMovie({
      id: movieId,
      title: info?.title || `Movie #${movieId}`,
      poster_path: info?.posterPath || "",
      overview: "",
      vote_average: 0,
      vote_count: 0,
    });
  };

  const handleShowClick = (showIdOrTvdbId: string | number) => {
    setSelectedShowId(showIdOrTvdbId);
    setIsTvModalOpen(true);
  };

  const handleLoadMoreShows = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/user/${userId}/tracked-shows?page=${nextPage}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setTvShows((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newUniqueShows = data.shows.filter((s: TrackedShow) => !existingIds.has(s.id));
          return [...prev, ...newUniqueShows];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more tracked shows:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Latest Movie Ratings */}
      {ratingsData.length > 0 && (
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
              <span
                className="material-symbols-outlined text-yellow-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                movie
              </span>
              Latest Rated Movies
            </h2>
            <span className="text-xs text-zinc-500 font-medium">Click to view details</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
            {ratingsData.slice(0, 12).map((r, idx) => {
              const info = movieInfoMap[r.movieId];
              const posterUrl = info?.posterPath ? TMDB_IMAGE_BASE + info.posterPath : null;

              return (
                <div
                  key={idx}
                  onClick={() => handleMovieClick(r.movieId)}
                  className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 border border-white/5 hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(255,204,0,0.15)] cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                >
                  {posterUrl ? (
                    <ImageWithLoader
                      src={posterUrl}
                      alt={info?.title ?? "Movie"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      wrapperClassName="w-full h-full"
                      loaderSize={12}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <span className="material-symbols-outlined text-zinc-700 text-3xl mb-1">movie</span>
                      <span className="text-[10px] text-zinc-400 truncate w-full">{info?.title ?? `Movie #${r.movieId}`}</span>
                    </div>
                  )}

                  {/* Rating overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5">
                    {r.rating && (
                      <span className="flex items-center gap-1 text-yellow-400 font-extrabold text-xs">
                        <span
                          className="material-symbols-outlined text-[12px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        {r.rating}/10
                      </span>
                    )}
                    {info?.title && (
                      <p className="text-white text-[11px] font-bold truncate mt-0.5">{info.title}</p>
                    )}
                  </div>

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">
                      visibility
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Watched Episodes - Styled similar to Social Feed Cards */}
      {watchedEpisodesData.length > 0 && (
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
              <span
                className="material-symbols-outlined text-teal-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                live_tv
              </span>
              Recently Watched Episodes
            </h2>
            <span className="text-xs text-zinc-500 font-medium">Click card to view show</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {watchedEpisodesData.map((ep, idx) => {
              const posterUrl = ep.show.posterPath ? TMDB_IMAGE_BASE + ep.show.posterPath : null;
              const targetShowId = ep.show.id || ep.show.tvdbId || ep.show.tmdbId;

              return (
                <div
                  key={idx}
                  onClick={() => targetShowId && handleShowClick(targetShowId)}
                  className="glass-panel border border-teal-500/15 hover:border-teal-400/40 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_8px_30px_rgba(45,212,191,0.12)] transition-all duration-300 flex group cursor-pointer"
                >
                  {/* Left Poster */}
                  <div className="w-24 sm:w-28 shrink-0 relative bg-zinc-950 border-r border-white/10 overflow-hidden group/cover">
                    {posterUrl ? (
                      <ImageWithLoader
                        src={posterUrl}
                        alt={ep.show.title}
                        className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500"
                        wrapperClassName="w-full h-full"
                        loaderSize={10}
                      />
                    ) : (
                      <div className="w-full h-full min-h-[120px] flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                        <span className="material-symbols-outlined text-zinc-600 text-3xl">live_tv</span>
                      </div>
                    )}
                    {/* Hover Hint */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="material-symbols-outlined text-white text-xl drop-shadow-md">
                        visibility
                      </span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white group-hover:text-teal-300 transition-colors truncate font-['Space_Grotesk'] tracking-tight">
                        {ep.show.title}
                      </h3>

                      {/* Episode Badge */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-400/30 shadow-[0_0_12px_rgba(45,212,191,0.15)]">
                          S{ep.seasonNumber.toString().padStart(2, "0")} · E
                          {ep.episodeNumber.toString().padStart(2, "0")}
                        </span>
                        {ep.name && (
                          <span className="text-zinc-300 font-medium text-xs truncate max-w-[220px] italic">
                            &quot;{ep.name}&quot;
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      {ep.watchedAt ? (
                        <p className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          {new Date(ep.watchedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      ) : (
                        <div />
                      )}
                      <span className="text-[11px] font-bold text-zinc-400 group-hover:text-teal-300 transition-colors flex items-center gap-0.5">
                        View Show
                        <span className="material-symbols-outlined text-[13px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracked TV Shows */}
      {tvShows.length > 0 && (
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
              <span
                className="material-symbols-outlined text-pink-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                tv
              </span>
              Tracked Shows ({totalTvShowsCount})
            </h2>
            <span className="text-xs text-zinc-500 font-medium">Click to view series details</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
            {tvShows.map((show, idx) => {
              const posterUrl = show.posterPath ? TMDB_IMAGE_BASE + show.posterPath : null;
              const formatted = formatTvStatus(show.status);
              const targetShowId = show.id || show.tvdbId || show.tmdbId;

              return (
                <div
                  key={show.id || idx}
                  onClick={() => targetShowId && handleShowClick(targetShowId)}
                  className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 border border-white/5 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                >
                  {posterUrl ? (
                    <ImageWithLoader
                      src={posterUrl}
                      alt={show.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      wrapperClassName="w-full h-full"
                      loaderSize={12}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <span className="material-symbols-outlined text-zinc-700 text-3xl mb-1">tv</span>
                      <span className="text-[10px] text-zinc-400 truncate w-full">{show.title}</span>
                    </div>
                  )}

                  {show.isFavorite && (
                    <div className="absolute top-2 right-2 rounded-lg bg-black/70 backdrop-blur-md p-1 border border-white/10 text-yellow-400">
                      <span
                        className="material-symbols-outlined text-[13px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        favorite
                      </span>
                    </div>
                  )}

                  {/* Status & Rating overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2.5 flex flex-col gap-1">
                    <p className="text-white text-[11px] font-bold truncate group-hover:text-purple-300 transition-colors">
                      {show.title}
                    </p>

                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md backdrop-blur-md ${formatted.bgClass}`}
                      >
                        {formatted.label}
                      </span>

                      {show.rating && (
                        <span className="flex items-center gap-0.5 text-yellow-400 font-extrabold text-[10px] shrink-0">
                          <span
                            className="material-symbols-outlined text-[10px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          {show.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">
                      visibility
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMoreShows}
                disabled={isLoadingMore}
                className="glass-panel hover:bg-white/10 active:scale-95 text-white font-bold text-xs uppercase tracking-wider px-8 py-3 rounded-xl border border-white/10 hover:border-purple-400/30 transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {isLoadingMore ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Loading More Shows...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                    Load More Tracked Shows ({totalTvShowsCount - tvShows.length} remaining)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <MovieModal
        movie={selectedMovie}
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        userLibrary={userLibrary}
        onLibraryUpdate={fetchUserLibrary}
      />

      <TvShowModal
        showId={selectedShowId}
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
      />
    </div>
  );
}
