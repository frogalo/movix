"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Movie } from "./TrendingMoviesCarousel";
import { useSession } from "next-auth/react";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { TrailerPlayer } from "@/components/common/TrailerPlayer";
import { VotingComponent } from "@/components/common/VotingComponent";

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

  if (!movie) {
    return (
      <section className="relative w-full h-[500px] md:h-[870px] overflow-hidden bg-zinc-900/50 animate-pulse">
        <div className="absolute z-20 bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 flex flex-col gap-stack-sm md:gap-stack-md">
          <div className="h-6 w-32 bg-white/10 rounded-full mb-2"></div>
          <div className="h-16 w-3/4 bg-white/10 rounded-lg mb-2"></div>
          <div className="h-6 w-48 bg-white/10 rounded-lg"></div>
          <div className="h-24 w-full max-w-2xl bg-white/10 rounded-lg mb-4 mt-2"></div>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="h-[56px] w-[180px] bg-white/10 rounded-lg"></div>
            <div className="h-[56px] w-[160px] bg-white/10 rounded-lg"></div>
            <div className="h-[56px] w-[100px] bg-white/10 rounded-lg"></div>
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
  if (!movie) return null;

  const bgImage = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : movie.poster_path 
      ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
      : "https://lh3.googleusercontent.com/aida-public/AB6AXuAjCmsDHsGPW5SbA70dw3GvBfY_R87xaX74hADDNg8v923tgsTr-Tnzl6auxgfpPaidQntP44aO6IFmdjKhgxrgFDcS0vawns9CgXLFzHJjDRf3RTfDvc4pbT2U4Wn3fVdavKHqcxWNiVTNTk0JnxrUg9e-vY6COVF_L-dlWNyzs1-0bUpgrx1dmySxrXbMub4T7QDVXe3DZr6YGrsulzkHbm_GvVtsPquPwxz97A3Mq-_DMoVhvIbThQMp8mSdyhqWrdo7_bfN8Ew7";

  return (
    <>
    <section className="relative w-full h-[500px] md:h-[870px] overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10 w-[70%]"></div>
      <ImageWithLoader
        alt="Hero Movie Backdrop"
        className="absolute inset-0 w-full h-full object-cover object-top opacity-80"
        src={bgImage}
        loaderSize={80}
      />
      <div className="absolute z-20 bottom-0 left-0 p-5 pb-20 md:pb-12 md:p-12 w-full md:w-2/3 flex flex-col gap-2 md:gap-stack-md">
        <div className="flex items-center gap-3 mb-2">
          <span className="glass-panel px-3 py-1 rounded-full text-primary-fixed-dim font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {movie.media_type === 'tv' ? 'live_tv' : 'theaters'}
            </span>
            {movie.media_type === 'tv' ? 'TV Series' : 'New Release'}
          </span>
        </div>
        <h1 className="font-display-xl text-[28px] md:text-display-xl text-white drop-shadow-lg leading-tight mb-1 md:mb-2 line-clamp-2">
          {title}
        </h1>
        <div className="flex items-center gap-4 text-zinc-300 font-body-md text-body-md">
          <div className="flex items-center text-primary-container">
            <span className="material-symbols-outlined text-[18px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="font-headline-md text-[18px] font-bold">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
          </div>
          <span>•</span>
          <span>{releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}</span>
        </div>
        <p className="font-body-lg text-[14px] md:text-body-lg text-zinc-300 max-w-2xl line-clamp-2 md:line-clamp-3 mb-2 md:mb-4">
          {movie.overview}
        </p>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 md:mt-2 relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTrailer(true)}
            className="bg-primary-container text-on-primary hover:bg-primary transition-colors px-4 py-2.5 md:px-6 md:py-4 rounded-lg font-headline-md text-[13px] md:text-[16px] flex items-center gap-1.5 md:gap-2 shadow-[0_0_15px_rgba(255,204,0,0.3)] touch-manipulation"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            Watch Trailer
          </motion.button>
          
          {isLoggedIn && (
            movie.media_type === 'tv' ? (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => onTvShowClick && onTvShowClick(movie)}
                className="bg-purple-600 text-white border border-transparent hover:bg-purple-500 transition-colors px-4 py-2.5 md:px-6 md:py-4 rounded-lg font-headline-md text-[13px] md:text-[16px] flex items-center gap-1.5 md:gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)] touch-manipulation"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>live_tv</span>
                Track Episodes & Vote
              </motion.button>
            ) : (
              <>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWatchlist}
                  disabled={isAdding}
                  className={`transition-colors px-4 py-2.5 md:px-6 md:py-4 rounded-lg font-headline-md text-[13px] md:text-[16px] flex items-center gap-1.5 md:gap-2 border disabled:opacity-50 touch-manipulation ${isInWatchlist ? 'bg-white text-black border-white hover:bg-zinc-200' : 'glass-panel text-white hover:bg-white/10 border-white/20'}`}
                >
                  <span className="material-symbols-outlined" style={isInWatchlist ? { fontVariationSettings: "'FILL' 1" } : {}}>{isAdding ? 'hourglass_empty' : (isInWatchlist ? 'bookmark_added' : 'add')}</span>
                  {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
                </motion.button>

                <VotingComponent
                  vote={userVote || null}
                  rating={userRating || null}
                  onVoteChange={handleVote}
                  onRatingChange={handleRating}
                  isActionInProgress={isRating}
                  label="Movie"
                />
              </>
            )
          )}
        </div>
      </div>
    </section>

    <TrailerPlayer
      movieId={movie.id}
      movieTitle={title}
      isOpen={showTrailer}
      onClose={() => setShowTrailer(false)}
    />
    </>
  );
}
