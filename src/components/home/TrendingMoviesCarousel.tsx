"use client";

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageWithLoader } from '@/components/common/ImageWithLoader';

export type Movie = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  media_type?: string;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string } | string>;
};

interface TrendingMoviesCarouselProps {
  movies: Movie[];
  selectedMovieId?: number;
  onMovieSelect: (movie: Movie) => void;
  isGrid?: boolean;
  onToggleGrid?: () => void;
  userLibrary?: { watchlists: any[], ratings: any[], tvShows?: any[], games?: any[] };
  onLoadMore?: () => void;
  showMovies: boolean;
  showTv: boolean;
  showGames: boolean;
  onToggleMovies: () => void;
  onToggleTv: () => void;
  onToggleGames: () => void;
}

export function TrendingMoviesCarousel({
  movies,
  selectedMovieId,
  onMovieSelect,
  isGrid = false,
  onToggleGrid,
  userLibrary,
  onLoadMore,
  showMovies,
  showTv,
  showGames,
  onToggleMovies,
  onToggleTv,
  onToggleGames,
}: TrendingMoviesCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobile(true);
    }
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section 
      className={`px-4 md:px-12 w-full relative z-20 ${isGrid ? 'pt-16 md:pt-20 pb-20 md:pb-24' : 'pt-1 pb-4'}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 md:mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-headline-lg text-[22px] md:text-[28px] text-white">
            {isGrid ? 'All Trending Media' : 'Trending Media'}
          </h2>
          
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-white/10 rounded-xl p-1 shadow-lg shrink-0">
            <button
              onClick={onToggleMovies}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all duration-200 touch-manipulation ${
                showMovies
                  ? "bg-yellow-400 text-[#241a00] shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              M
            </button>
            <button
              onClick={onToggleTv}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all duration-200 touch-manipulation ${
                showTv
                  ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              S
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          {!isGrid && (
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={scrollLeft} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button onClick={scrollRight} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          )}
          <button
            onClick={onToggleGrid}
            className="text-tertiary-fixed-dim hover:text-tertiary font-body-md text-body-md items-center gap-1 transition-colors bg-transparent border-none cursor-pointer hidden md:flex"
          >
            {isGrid ? 'Show Less' : 'See All'} 
            <span className="material-symbols-outlined text-[18px]">
              {isGrid ? 'expand_less' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </div>
      <div 
        ref={scrollContainerRef}
        onScroll={(e: React.UIEvent<HTMLDivElement>) => {
          if (isGrid) return;
          const { scrollLeft, clientWidth, scrollWidth } = e.currentTarget;
          if (scrollWidth - scrollLeft <= clientWidth + 300) {
            if (onLoadMore) onLoadMore();
          }
        }}
        className={isGrid 
          ? "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6" 
          : "flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar py-6 px-4 -my-3 -mx-2 pr-4 md:pr-12 touch-pan-x"}
      >
        {movies.map((movie, index) => {
          const title = movie.title || movie.name || 'Unknown';
          const releaseDate = movie.release_date || movie.first_air_date || '';
          const isGame = movie.media_type === 'game';
          const isTv = !isGame && (movie.media_type === 'tv' || (!movie.title && !!movie.name));
          const userRating = userLibrary?.ratings?.find(r => r.movieId === movie.id)?.rating;
          const inWatchlist = !isTv && !isGame && userLibrary?.watchlists?.some(w => w.movieId === movie.id) && !userRating;
          const isTrackedTv = isTv && userLibrary?.tvShows?.some(s => s.tmdbId === movie.id);
          const isTrackedGame = isGame && userLibrary?.games?.some(g => g.gameId === movie.id);

          const isSelected = selectedMovieId === movie.id;

          return (
            <motion.div
              layout={!isMobile}
              transition={isMobile ? { duration: 0 } : { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              whileHover={isMobile ? undefined : { scale: 1.04, transition: { duration: 0.15 } }}
              key={movie.id}
              onClick={() => onMovieSelect(movie)}
              className={`relative aspect-[2/3] shrink-0 rounded-xl overflow-hidden group cursor-pointer touch-manipulation z-10 hover:z-30 transition-shadow duration-200 ${
                isGrid ? 'w-full min-w-0' : 'flex-none w-[calc(33vw-20px)] md:w-36 lg:w-40 xl:w-44 min-w-[130px] md:min-w-[144px]'
              } ${
                isSelected && !isGrid
                  ? (isTv
                      ? 'border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] z-20'
                      : isGame
                        ? 'border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] z-20'
                        : 'border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] z-20')
                  : 'border border-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(87,27,193,0.4)]'
              }`}
            >
              <motion.div layout={!isMobile} className="w-full h-full">
                {movie.poster_path ? (
                  <ImageWithLoader
                    alt={title}
                    className="w-full h-full object-cover"
                    src={movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    loaderSize={40}
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-sm text-center p-2">
                    {title}
                  </div>
                )}

                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-20 pointer-events-none">
                  {inWatchlist && (
                    <div className="bg-black/80 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center border border-white/20 shadow-lg">
                      <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                    </div>
                  )}
                  {isTrackedTv && (
                    <div className="bg-black/80 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center border border-white/20 shadow-lg">
                      <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>live_tv</span>
                    </div>
                  )}
                  {isTrackedGame && (
                    <div className="bg-black/80 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center border border-white/20 shadow-lg">
                      <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
                    </div>
                  )}
                  {userRating && (
                    <div className="bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center justify-center border border-white/20 shadow-lg gap-0.5">
                      <span className="material-symbols-outlined text-[12px] text-yellow-400 transition-transform duration-500 ease-out group-hover:scale-125 group-hover:rotate-[15deg]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-[12px] font-bold text-white transition-transform duration-500 ease-out group-hover:scale-105">{userRating}</span>
                    </div>
                  )}
                </div>
              
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20 pointer-events-none">
                  <div className={`backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center justify-center border shadow-lg text-[9px] font-black tracking-wider ${
                    isGame
                      ? "bg-emerald-600/90 border-emerald-400/30 text-white"
                      : isTv 
                        ? "bg-purple-600/90 border-purple-400/30 text-white" 
                        : "bg-yellow-500/90 border-yellow-400/30 text-black"
                  }`}>
                    {isGame ? 'G' : (isTv ? 'S' : 'M')}
                  </div>
                </div>

                {index < 10 && !isGrid && (
                  <div className="absolute bottom-2 right-2 z-20 pointer-events-none bg-primary-container text-on-primary font-label-sm text-[10px] px-2 py-1 rounded-full font-bold shadow-lg border border-white/5">
                    TOP {index + 1}
                  </div>
                )}
              
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4">
                  <div className="flex items-center gap-1 text-primary-container mb-1">
                    <span className="material-symbols-outlined text-[12px] md:text-[14px] transition-transform duration-500 ease-out group-hover:scale-125 group-hover:rotate-[15deg]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label-sm text-[10px] md:text-label-sm transition-transform duration-500 ease-out group-hover:scale-105 inline-block">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                  </div>
                  <h3 className="font-headline-md text-[14px] md:text-[16px] text-white truncate">{title}</h3>
                  <p className="font-label-sm text-[10px] md:text-label-sm text-zinc-400 mt-1 truncate">
                    {releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
