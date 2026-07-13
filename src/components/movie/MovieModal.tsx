"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Movie } from "@/components/home/TrendingMoviesCarousel";
import { useSession } from "next-auth/react";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { TrailerPlayer } from "@/components/common/TrailerPlayer";
import { VotingComponent } from "@/components/common/VotingComponent";
import { MovieCastList, CastMember } from "@/components/movie/MovieCastList";
import { MovieProvidersList, StreamingProvider } from "@/components/movie/MovieProvidersList";

type LibraryEntry = {
  movieId: number;
  rating?: number | null;
  vote?: string | null;
};

type Genre = {
  id: number;
  name: string;
};

type MovieExtraInfo = {
  genres?: Genre[];
  runtime?: number | null;
  cast?: CastMember[];
  providers?: StreamingProvider[];
};

interface MovieModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  userLibrary: { watchlists: LibraryEntry[]; ratings: LibraryEntry[] };
  onLibraryUpdate: () => void;
}

export function MovieModal({
  movie,
  isOpen,
  onClose,
  userLibrary,
  onLibraryUpdate,
}: MovieModalProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [isAdding, setIsAdding] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [extraInfo, setExtraInfo] = useState<MovieExtraInfo | null>(null);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (movie && isOpen) {
      setIsLoadingExtra(true);
      fetch(`/api/movies/${movie.id}`)
        .then((res) => res.json())
        .then((data: MovieExtraInfo) => setExtraInfo(data))
        .catch(console.error)
        .finally(() => setIsLoadingExtra(false));
    } else {
      setExtraInfo(null);
    }
  }, [movie, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const heroImage = movie
    ? movie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
      : movie.poster_path
        ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
        : null
    : null;

  if (!movie) return null;

  const isInWatchlist = userLibrary.watchlists.some((entry) => entry.movieId === movie.id);
  const userRating = userLibrary.ratings.find((entry) => entry.movieId === movie.id)?.rating;
  const userVote = userLibrary.ratings.find((entry) => entry.movieId === movie.id)?.vote;
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
  const runtimeLabel = extraInfo?.runtime
    ? `${Math.floor(extraInfo.runtime / 60)}h ${extraInfo.runtime % 60}m`
    : null;
  const genreNames = extraInfo?.genres?.slice(0, 3).map((genre) => genre.name) ?? [];
  const score = movie.vote_average ? movie.vote_average.toFixed(1) : "NR";
  const scoreDashOffset = 176 - (Math.min(movie.vote_average || 0, 10) / 10) * 176;
  const posterImage = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : heroImage;

  const handleWatchlist = async () => {
    setIsAdding(true);

    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.id }),
      });
      onLibraryUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRating = async (ratingValue: number | null) => {
    setIsRating(true);

    try {
      if (ratingValue === null && !userVote) {
        await fetch(`/api/rating?movieId=${movie.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/rating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId: movie.id, rating: ratingValue }),
        });
      }
      onLibraryUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setIsRating(false);
    }
  };

  const handleVote = async (voteValue: string | null) => {
    setIsRating(true);

    try {
      if (voteValue === null && !userRating) {
        await fetch(`/api/rating?movieId=${movie.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/rating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId: movie.id, vote: voteValue }),
        });
      }
      onLibraryUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setIsRating(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-8 overscroll-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="glass-panel relative z-10 flex h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col overflow-y-auto md:overflow-hidden rounded-none md:rounded-[2rem] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:flex-row"
            >
              <button
                onClick={onClose}
                className="fixed md:absolute right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-black/80 touch-manipulation"
                style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {isLoggedIn && (
                <button
                  onClick={handleWatchlist}
                  disabled={isAdding}
                  className="absolute left-4 z-20 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-black/80 touch-manipulation"
                  style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
                  aria-label="Save to watchlist"
                >
                  <span
                    className="material-symbols-outlined"
                    style={isInWatchlist ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {isAdding ? "hourglass_empty" : isInWatchlist ? "bookmark_added" : "bookmarks"}
                  </span>
                </button>
              )}

              <div className="relative w-full shrink-0 overflow-hidden h-[300px] md:h-auto md:w-[44%]">
                {heroImage ? (
                  <ImageWithLoader
                    src={heroImage}
                    alt={movie.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loaderSize={60}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <span className="material-symbols-outlined text-7xl text-zinc-700">
                      movie
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/85" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,204,0,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(87,27,193,0.3),transparent_45%)]" />

                <div className="absolute bottom-6 left-6 right-6 md:hidden">
                  <div className="mb-3 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-yellow-300">
                    Trending Pick
                  </div>
                  <h2 className="font-headline-lg text-3xl text-white drop-shadow-lg">
                    {movie.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#ffedc3]">
                    {releaseYear}
                    {runtimeLabel ? ` • ${runtimeLabel}` : ""}
                    {genreNames.length ? ` • ${genreNames.join(" • ")}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-visible md:overflow-y-auto p-5 pb-24 md:p-10 md:pb-10 md:pt-10 overscroll-none">
                <header className="hidden space-y-3 md:block">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-label-sm uppercase tracking-[0.24em] text-yellow-300">
                      Trending #{Math.max(1, Math.ceil((movie.vote_average || 1) / 2))}
                    </span>
                    <span className="text-label-sm uppercase tracking-[0.24em] text-zinc-500">
                      TMDB Spotlight
                    </span>
                  </div>

                  <h2 className="font-display-xl text-5xl leading-none tracking-[-0.04em] text-white lg:text-6xl">
                    {movie.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    <span>{releaseYear}</span>
                    {runtimeLabel ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-zinc-600" />
                        <span>{runtimeLabel}</span>
                      </>
                    ) : null}
                    {genreNames.length ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-zinc-600" />
                        <div className="flex flex-wrap gap-2">
                          {genreNames.map((genre) => (
                            <span
                              key={genre}
                              className="rounded-md border border-white/5 bg-surface-container px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </header>

                <div className="mt-0 flex flex-col gap-8 md:mt-8">
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-5 rounded-[1.5rem] border border-white/5 bg-surface-container-low/60 p-4">
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <svg className="h-full w-full -rotate-90">
                          <circle
                            className="text-white/10"
                            cx="32"
                            cy="32"
                            r="28"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <circle
                            className="text-primary-container"
                            cx="32"
                            cy="32"
                            r="28"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeDasharray="176"
                            strokeDashoffset={scoreDashOffset}
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-primary-container">
                          {score}
                        </span>
                      </div>

                      <div>
                        <div className="flex text-primary-container">
                          {Array.from({ length: 5 }).map((_, index) => {
                            const filled = (movie.vote_average || 0) / 2 >= index + 1;
                            const half = !filled && (movie.vote_average || 0) / 2 > index;

                            return (
                              <span
                                key={index}
                                className="material-symbols-outlined text-[18px]"
                                style={{
                                  fontVariationSettings:
                                    half || filled ? "'FILL' 1" : "'FILL' 0",
                                }}
                              >
                                star
                              </span>
                            );
                          })}
                        </div>
                        <p className="text-sm font-medium text-white">Audience Score</p>
                        <p className="text-label-sm uppercase tracking-[0.18em] text-zinc-500">
                          {movie.vote_count} ratings
                        </p>
                      </div>
                    </div>

                    {posterImage ? (
                      <div className="hidden overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.35)] md:block md:w-28">
                        <ImageWithLoader
                          src={posterImage}
                          alt={`${movie.title} poster`}
                          className="aspect-[2/3] h-full w-full object-cover"
                          loaderSize={40}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-headline-md text-xl text-white">Overview</h3>
                    <p className="max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
                      {movie.overview || "No overview available."}
                    </p>
                  </div>

                  <MovieCastList isLoading={isLoadingExtra} cast={extraInfo?.cast} />

                  <MovieProvidersList isLoading={isLoadingExtra} providers={extraInfo?.providers} />

                  <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 pt-6">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowTrailer(true)}
                      className="flex min-w-0 md:min-w-[180px] flex-1 items-center justify-center gap-2 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 px-4 md:px-6 py-3 md:py-4 text-sm font-semibold text-white transition hover:bg-white/10 touch-manipulation"
                    >
                      <span className="material-symbols-outlined">movie</span>
                      Watch Trailer
                    </motion.button>

                    {isLoggedIn && (
                      <VotingComponent
                        vote={userVote || null}
                        rating={userRating || null}
                        onVoteChange={handleVote}
                        onRatingChange={handleRating}
                        isActionInProgress={isRating}
                        label="Movie"
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {movie && (
        <TrailerPlayer
          movieId={movie.id}
          movieTitle={movie.title ?? ""}
          isOpen={showTrailer}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </>
  );
}
