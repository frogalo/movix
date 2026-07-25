"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ImageWithLoader } from '@/components/common/ImageWithLoader';
import { Movie } from './TrendingMoviesCarousel';
import { Star, Bookmark, BookmarkMinus, Tv, User, Info } from 'lucide-react';

interface TopRatedMoviesCarouselProps {
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  isGrid?: boolean;
  userLibrary?: { watchlists: any[], ratings: any[], tvShows?: any[] };
  onLoadMore?: () => void;
  showMovies: boolean;
  showTv: boolean;
  onToggleMovies: () => void;
  onToggleTv: () => void;
  onLibraryUpdate?: () => void;
  activeGenres: string[];
  activeDecades: string[];
  onToggleGenre: (genre: string) => void;
  onToggleDecade: (decade: string) => void;
  onResetFilters: () => void;
}

const GENRE_MAP: { [key: string]: number[] } = {
  "Action": [28, 10759],
  "Animation": [16],
  "Comedy": [35],
  "Drama": [18],
  "Sci-Fi / Fantasy": [878, 14, 10765],
  "Thriller / Mystery": [53, 9648],
  "Romance": [10749]
};

export function TopRatedMoviesCarousel({
  movies,
  onMovieSelect,
  isGrid = false,
  userLibrary,
  onLoadMore,
  showMovies,
  showTv,
  onToggleMovies,
  onToggleTv,
  onLibraryUpdate,
  activeGenres,
  activeDecades,
  onToggleGenre,
  onToggleDecade,
  onResetFilters,
}: TopRatedMoviesCarouselProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobile(true);
    }
  }, []);

  const getRatingGroup = (rating: number) => {
    return Math.floor(rating / 0.5);
  };

  const getRatingGroupLabel = (ratingGroup: number) => {
    const percentage = ratingGroup * 5;
    return `${percentage}% - ${percentage + 5}% Rating`;
  };

  // Group movies by rating group (every 0.5 points)
  const groupedMovies: { [key: number]: Movie[] } = {};
  movies.forEach(movie => {
    const group = getRatingGroup(movie.vote_average);
    if (!groupedMovies[group]) {
      groupedMovies[group] = [];
    }
    groupedMovies[group].push(movie);
  });

  const sortedGroups = Object.keys(groupedMovies)
    .map(Number)
    .sort((a, b) => b - a);

  // Map each movie ID to its global index in the overall sorted list
  const globalIndexMap = new Map<number, number>();
  movies.forEach((m, idx) => {
    globalIndexMap.set(m.id, idx);
  });

  const handleWatchlist = async (movie: Movie) => {
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.id }),
      });
      if (onLibraryUpdate) onLibraryUpdate();
    } catch (error) {
      console.error("Watchlist toggle failed", error);
    }
  };

  const handleTvTrack = async (movie: Movie) => {
    const isTracked = userLibrary?.tvShows?.some(s => s.tmdbId === movie.id);
    try {
      if (isTracked) {
        const trackedShow = userLibrary?.tvShows?.find(s => s.tmdbId === movie.id);
        const tvdbId = trackedShow ? trackedShow.tvdbId : movie.id;
        await fetch(`/api/tv?tvdbId=${tvdbId}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/tv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tvdbId: movie.id,
            tmdbId: movie.id,
            title: movie.name || movie.title || "Unknown Show",
            status: "watching",
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
          }),
        });
      }
      if (onLibraryUpdate) onLibraryUpdate();
    } catch (error) {
      console.error("TV Track toggle failed", error);
    }
  };

  const renderMovieCard = (movie: Movie, isSectionGrid: boolean) => {
    const title = movie.title || movie.name || 'Unknown';
    const releaseDate = movie.release_date || movie.first_air_date || '';
    const isTv = movie.media_type === 'tv' || (!movie.title && !!movie.name);
    const userRating = userLibrary?.ratings?.find(r => r.movieId === movie.id)?.rating;
    const inWatchlist = !isTv && userLibrary?.watchlists?.some(w => w.movieId === movie.id) && !userRating;
    const isTrackedTv = isTv && userLibrary?.tvShows?.some(s => s.tmdbId === movie.id);
    const globalIdx = globalIndexMap.get(movie.id) ?? 0;
    const isInflated = movie.vote_average >= 8.0 && movie.vote_count > 0 && movie.vote_count < 1000;

    return (
      <div
        key={movie.id}
        onClick={() => onMovieSelect(movie)}
        className={`relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] touch-manipulation ${isSectionGrid ? 'w-full' : 'flex-none w-[calc(33vw-20px)] md:w-48'}`}
      >
        <motion.div whileHover={isMobile ? undefined : { scale: 1.05 }} className="w-full h-full transition-transform duration-300">
          {movie.poster_path ? (
            <ImageWithLoader
              alt={title}
              className="w-full h-full object-cover"
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              loaderSize={40}
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-sm text-center p-2">
              {title}
            </div>
          )}

          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-20 pointer-events-none">
            {/* TMDB Average Rating Badge - shown by default */}
            <div className="bg-black/85 backdrop-blur-md rounded-lg px-2 py-1 flex items-center justify-center border border-yellow-400/30 shadow-lg gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[12px] font-black text-yellow-400">
                {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
              </span>
            </div>

            {inWatchlist && (
              <div className="bg-black/80 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center border border-white/20 shadow-lg">
                <Bookmark className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            )}
            {isTrackedTv && (
              <div className="bg-black/80 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center border border-white/20 shadow-lg">
                <Tv className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            {userRating && (
              <div className="bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center justify-center border border-white/20 shadow-lg gap-0.5">
                <User className="w-3 h-3 text-white fill-white" />
                <span className="text-[12px] font-bold text-white">{userRating}</span>
              </div>
            )}
          </div>
        
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start z-20 pointer-events-none">
            <div className={`backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center justify-center border shadow-lg text-[9px] font-black tracking-wider ${
              isTv 
                ? "bg-purple-600/90 border-purple-400/30 text-white" 
                : "bg-yellow-500/90 border-yellow-400/30 text-black"
            }`}>
              {isTv ? 'S' : 'M'}
            </div>
            {isInflated && (
              <div className="bg-amber-500/90 backdrop-blur-md rounded-md px-1.5 py-0.5 flex items-center justify-center border border-amber-400/30 shadow-lg text-[8px] font-bold text-white uppercase tracking-wider gap-0.5">
                <Info className="w-2 h-2 text-white shrink-0" />
                <span>Few Votes</span>
              </div>
            )}
          </div>

          {globalIdx < 10 && !isSectionGrid && (
            <div className="absolute bottom-2 right-2 z-20 pointer-events-none bg-primary-container text-on-primary font-label-sm text-[10px] px-2 py-1 rounded-full font-bold shadow-lg border border-white/5">
              TOP {globalIdx + 1}
            </div>
          )}
        
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4 z-30">
            {/* Quick Actions Row */}
            {((isTv && !isTrackedTv) || (!isTv && !userRating)) && (
              <div className="flex gap-2 mb-2 select-none">
                {isTv ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTvTrack(movie);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 border cursor-pointer bg-white/10 border-white/5 text-zinc-300 hover:bg-white/20 hover:text-white"
                  >
                    <Tv className="w-3 h-3 leading-none" />
                    Track
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatchlist(movie);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 border cursor-pointer ${
                      inWatchlist
                        ? "bg-yellow-400/40 border-yellow-500/50 text-white shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                        : "bg-white/10 border-white/5 text-zinc-300 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {inWatchlist ? (
                      <BookmarkMinus className="w-3 h-3 leading-none" />
                    ) : (
                      <Bookmark className="w-3 h-3 leading-none" />
                    )}
                    Watchlist
                  </button>
                )}
              </div>
            )}

            <h3 className="font-headline-md text-[14px] md:text-[16px] text-white truncate">{title}</h3>
            <p className="font-label-sm text-[10px] md:text-label-sm text-zinc-400 mt-1 truncate">
              {releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <section className="px-4 md:px-12 py-6 relative z-20 w-full pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-headline-lg text-[24px] md:text-[32px] text-white">
            Top Rated Movies & TV Shows
          </h2>
          
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-white/10 rounded-xl p-1 shadow-lg shrink-0">
            <button
              onClick={onToggleMovies}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all duration-200 touch-manipulation ${
                showMovies
                  ? "bg-yellow-400 text-zinc-950 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              M
            </button>
            <button
              onClick={onToggleTv}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all duration-200 touch-manipulation ${
                showTv
                  ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              S
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pill Sections */}
      <div className="flex flex-col gap-3 mb-6 font-['Space_Grotesk']">
        {/* Genre Filters */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0 select-none">
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mr-2 shrink-0">Genre:</span>
          {["All Genres", ...Object.keys(GENRE_MAP)].map(genre => {
            const isActive = activeGenres.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => onToggleGenre(genre)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-yellow-400 text-zinc-950 font-extrabold shadow-[0_0_10px_rgba(250,204,21,0.4)] border border-yellow-300"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:bg-white/10"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Decade Filters */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0 select-none">
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mr-2 shrink-0">Decade:</span>
          {["All Decades", "2020s", "2010s", "2000s", "90s", "80s", "70s & older"].map(decade => {
            const isActive = activeDecades.includes(decade);
            return (
              <button
                key={decade}
                onClick={() => onToggleDecade(decade)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white font-extrabold shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-500"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:bg-white/10"
                }`}
              >
                {decade}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-8 w-full">
        {movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center select-none w-full">
            <span className="material-symbols-outlined text-[48px] text-zinc-600 mb-3">filter_list_off</span>
            <h3 className="font-headline-md text-lg text-white mb-1">No Results Found</h3>
            <p className="text-zinc-500 text-xs max-w-xs mb-5">Try clearing or adjusting your genre and decade filters.</p>
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-yellow-400 text-zinc-950 font-black text-xs uppercase shadow-[0_0_10px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          sortedGroups.map((groupKey, groupIdx) => {
            const groupMovies = groupedMovies[groupKey];
            if (!groupMovies || groupMovies.length === 0) return null;

            return (
              <div key={groupKey} className="w-full">
                {groupIdx > 0 && (
                  <div className="w-full flex items-center justify-center py-4">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xs font-black tracking-widest text-yellow-400/80 uppercase bg-yellow-400/5 px-2.5 py-1 rounded-md border border-yellow-400/10">
                    {getRatingGroupLabel(groupKey)}
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-white/5">
                    {groupMovies.length}
                  </span>
                </div>

                {isGrid ? (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                    {groupMovies.map((movie) => renderMovieCard(movie, true))}
                  </div>
                ) : (
                  <div className="flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar pb-2 pt-1 touch-pan-x items-stretch">
                    {groupMovies.map((movie) => renderMovieCard(movie, false))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
