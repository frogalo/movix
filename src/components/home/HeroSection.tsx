"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Movie } from "./TrendingMoviesCarousel";
import { useSession } from "next-auth/react";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { TrailerPlayer } from "@/components/common/TrailerPlayer";
import { VotingComponent } from "@/components/common/VotingComponent";
import { ActorModal } from "@/components/person/ActorModal";

const GENRE_MAP: Record<number, string> = {
  // Movies
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
}

interface HeroSectionProps {
  movie?: Movie | null;
  userLibrary: { watchlists: any[], ratings: any[] };
  onLibraryUpdate: () => void;
  onTvShowClick?: (movie: Movie) => void;
}

export function HeroSection({ movie, userLibrary, onLibraryUpdate, onTvShowClick }: HeroSectionProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [isAdding, setIsAdding] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [topCast, setTopCast] = useState<CastMember[]>([]);
  const [isLoadingCast, setIsLoadingCast] = useState(true);
  const [extraGenres, setExtraGenres] = useState<string[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [isActorModalOpen, setIsActorModalOpen] = useState(false);
  const [hoveredActor, setHoveredActor] = useState<CastMember | null>(null);

  useEffect(() => {
    setHoveredActor(null);
    if (!movie?.id) {
      setTopCast([]);
      setExtraGenres([]);
      setIsLoadingCast(false);
      return;
    }
    setIsLoadingCast(true);
    setTopCast([]);
    let isMounted = true;
    const isTv = movie.media_type === 'tv' || (!movie.title && !!movie.name);
    const endpoint = isTv ? `/api/tv/${movie.id}` : `/api/movies/${movie.id}`;

    fetch(endpoint)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted || !data) return;
        const castList = data.details?.cast || data.cast || [];
        setTopCast(castList.slice(0, 5));
        const gList = data.details?.genres || data.genres;
        if (gList && Array.isArray(gList)) {
          setExtraGenres(gList.map((g: any) => typeof g === 'string' ? g : g.name).filter(Boolean));
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setIsLoadingCast(false);
      });

    return () => {
      isMounted = false;
    };
  }, [movie?.id, movie?.media_type, movie?.title, movie?.name]);

  if (!movie) {
    return (
      <section className="relative w-full h-[calc(100vh-350px)] min-h-[380px] overflow-hidden bg-zinc-900/50 animate-pulse">
        <div className="absolute z-20 bottom-0 left-0 p-4 sm:p-6 md:p-10 pb-4 md:pb-6 w-full md:w-2/3 flex flex-col gap-3">
          <div className="h-6 w-32 bg-white/10 rounded-full mb-1"></div>
          <div className="h-12 w-3/4 bg-white/10 rounded-lg mb-1"></div>
          <div className="h-5 w-48 bg-white/10 rounded-lg"></div>
          <div className="h-16 w-full max-w-2xl bg-white/10 rounded-lg mb-2"></div>
          <div className="flex flex-wrap gap-4 mt-1">
            <div className="h-[48px] w-[160px] bg-white/10 rounded-lg"></div>
            <div className="h-[48px] w-[140px] bg-white/10 rounded-lg"></div>
            <div className="h-[48px] w-[140px] bg-white/10 rounded-lg"></div>
          </div>
        </div>
      </section>
    );
  }

  const isInWatchlist = userLibrary?.watchlists?.some(w => w.movieId === movie.id);
  const userRating = userLibrary?.ratings?.find(r => r.movieId === movie.id)?.rating;
  const userVote = userLibrary?.ratings?.find(r => r.movieId === movie.id)?.vote;
  const title = movie.title || movie.name || 'Unknown';
  const releaseDate = movie.release_date || movie.first_air_date || '';

  // Resolve Genres
  const genreNames: string[] = (movie.genres && (movie.genres as any[]).length > 0)
    ? (movie.genres as any[]).map((g: any) => typeof g === 'string' ? g : g.name).filter(Boolean)
    : (movie.genre_ids && movie.genre_ids.length > 0)
      ? movie.genre_ids.map((id: number) => GENRE_MAP[id]).filter(Boolean)
      : extraGenres;
  const genreString = genreNames.slice(0, 3).join(', ');

  const handleWatchlist = async () => {
    if (!movie) return;
    setIsAdding(true);
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: movie.id })
      });
      onLibraryUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRating = async (ratingValue: number | null) => {
    if (!movie) return;
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsRating(false);
    }
  };

  const handleVote = async (voteValue: string | null) => {
    if (!movie) return;
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsRating(false);
    }
  };

  const bgImage = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : movie.poster_path 
      ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
      : "https://lh3.googleusercontent.com/aida-public/AB6AXuAjCmsDHsGPW5SbA70dw3GvBfY_R87xaX74hADDNg8v923tgsTr-Tnzl6auxgfpPaidQntP44aO6IFmdjKhgxrgFDcS0vawns9CgXLFzHJjDRf3RTfDvc4pbT2U4Wn3fVdavKHqcxWNiVTNTk0JnxrUg9e-vY6COVF_L-dlWNyzs1-0bUpgrx1dmySxrXbMub4T7QDVXe3DZr6YGrsulzkHbm_GvVtsPquPwxz97A3Mq-_DMoVhvIbThQMp8mSdyhqWrdo7_bfN8Ew7";

  return (
    <>
    <section className="relative w-full h-[calc(100vh-350px)] min-h-[380px] overflow-hidden group">
      {/* Full cover backdrop expanding behind title all the way down */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ImageWithLoader
          alt=""
          className="w-full h-full object-cover object-top opacity-85"
          src={bgImage}
          loaderSize={80}
        />
        {/* Soft horizontal and top gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent z-10 w-[75%]"></div>
        {/* Lower blurred bottom border vignette */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/70 to-transparent backdrop-blur-[4px] z-10"></div>
      </div>

      <div className="absolute z-20 bottom-0 left-0 p-4 sm:p-6 md:p-10 pb-4 md:pb-6 w-full md:w-[75%] lg:w-[65%] flex flex-col gap-1.5 md:gap-2 justify-end">
        <div className="flex items-center gap-3 mb-1">
          <span className="glass-panel px-3 py-1 rounded-full text-primary-fixed-dim font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {movie.media_type === 'tv' ? 'live_tv' : 'theaters'}
            </span>
            {movie.media_type === 'tv' ? 'TV Series' : 'New Release'}
          </span>
        </div>
        <h1 className="font-display-xl text-[24px] sm:text-[28px] md:text-[36px] lg:text-display-xl text-white drop-shadow-lg leading-tight mb-0.5 md:mb-1 line-clamp-2">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3 text-zinc-300 font-body-md text-body-md">
          <div className="flex items-center text-primary-container">
            <span className="material-symbols-outlined text-[18px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="font-headline-md text-[18px] font-bold">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
          </div>
          <span>•</span>
          <span>{releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}</span>
          {genreString && (
            <>
              <span>•</span>
              <span className="text-zinc-300 font-medium">{genreString}</span>
            </>
          )}
        </div>
        <p className="font-body-lg text-[13px] md:text-[15px] lg:text-body-lg text-zinc-300 max-w-2xl line-clamp-2 md:line-clamp-3 mb-1 md:mb-2">
          {movie.overview}
        </p>
        <div className="flex flex-wrap items-center gap-3 md:gap-5 mt-1 relative">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTrailer(true)}
              className="bg-primary-container text-on-primary hover:bg-primary transition-colors px-4 py-2.5 md:px-5 md:py-3.5 rounded-lg font-headline-md text-[13px] md:text-[15px] flex items-center gap-1.5 md:gap-2 shadow-[0_0_15px_rgba(255,204,0,0.3)] touch-manipulation cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Watch Trailer
            </motion.button>
            
            {isLoggedIn && (
              movie.media_type === 'tv' ? (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTvShowClick && onTvShowClick(movie)}
                  className="bg-purple-600 text-white border border-transparent hover:bg-purple-500 transition-colors px-4 py-2.5 md:px-5 md:py-3.5 rounded-lg font-headline-md text-[13px] md:text-[15px] flex items-center gap-1.5 md:gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)] touch-manipulation cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>live_tv</span>
                  Track Episodes & Vote
                </motion.button>
              ) : (
                <>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleWatchlist}
                    disabled={isAdding}
                    className={`transition-colors px-4 py-2.5 md:px-5 md:py-3.5 rounded-lg font-headline-md text-[13px] md:text-[15px] flex items-center gap-1.5 md:gap-2 border disabled:opacity-50 touch-manipulation cursor-pointer ${isInWatchlist ? 'bg-white text-black border-white hover:bg-zinc-200' : 'glass-panel text-white hover:bg-white/10 border-white/20'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={isInWatchlist ? { fontVariationSettings: "'FILL' 1" } : {}}>{isAdding ? 'hourglass_empty' : (isInWatchlist ? 'bookmark_added' : 'add')}</span>
                    {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
                  </motion.button>

                  <VotingComponent
                    vote={userVote || null}
                    rating={userRating || null}
                    onVoteChange={handleVote}
                    onRatingChange={handleRating}
                    isActionInProgress={isRating}
                    label="Movie"
                    buttonClassName="px-4 py-2.5 md:px-5 md:py-3.5 rounded-lg font-headline-md text-[13px] md:text-[15px] flex items-center gap-1.5 md:gap-2 h-auto"
                  />
                </>
              )
            )}
          </div>

          {/* Top Cast Actor Avatars / Skeleton */}
          {isLoadingCast ? (
            <div className="flex items-center gap-2.5 pl-0 md:pl-2 border-l-0 md:border-l md:border-white/15 py-1">
              <div className="flex items-center -space-x-2.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="relative rounded-full p-0.5 bg-zinc-900 border border-white/20 animate-pulse"
                  >
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-zinc-400 hidden sm:inline-block tracking-wide">
                Top Cast
              </span>
            </div>
          ) : topCast.length > 0 ? (
            <div className="flex items-center gap-2.5 pl-0 md:pl-2 border-l-0 md:border-l md:border-white/15 py-1">
              <div className="flex items-center -space-x-2.5">
                {topCast.map((actor) => (
                  <div key={actor.id} className="relative">
                    <button
                      onMouseEnter={() => setHoveredActor(actor)}
                      onMouseLeave={() => setHoveredActor(null)}
                      onClick={() => {
                        setSelectedActorId(actor.id);
                        setIsActorModalOpen(true);
                      }}
                      className="relative rounded-full p-0.5 bg-zinc-900 border border-white/20 hover:border-yellow-400 hover:scale-125 hover:z-40 transition-transform duration-150 cursor-pointer shadow-md focus:outline-none"
                    >
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                        {actor.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[20px] text-zinc-400">person</span>
                        )}
                      </div>
                    </button>

                    {/* Single floating tooltip rendered strictly on hover of this actor */}
                    <AnimatePresence>
                      {hoveredActor?.id === actor.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.92 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 whitespace-nowrap"
                        >
                          <div className="bg-zinc-950/95 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-white/20 shadow-2xl text-center">
                            <p className="text-white font-bold leading-tight">{actor.name}</p>
                            {actor.character && (
                              <p className="text-[10px] text-yellow-400/90 font-normal mt-0.5 leading-tight">{actor.character}</p>
                            )}
                          </div>
                          <div className="w-2 h-2 bg-zinc-950/95 -mt-1 mx-auto rotate-45 border-r border-b border-white/20"></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-zinc-400 hidden sm:inline-block tracking-wide">
                Top Cast
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>

    <TrailerPlayer
      movieId={movie.id}
      movieTitle={title}
      isOpen={showTrailer}
      onClose={() => setShowTrailer(false)}
    />

    <ActorModal
      personId={selectedActorId}
      isOpen={isActorModalOpen}
      onClose={() => setIsActorModalOpen(false)}
    />
    </>
  );
}
