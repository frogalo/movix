"use client";

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageWithLoader } from './ImageWithLoader';

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
};

interface TrendingMoviesCarouselProps {
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  isGrid?: boolean;
  onToggleGrid?: () => void;
  userLibrary?: { watchlists: any[], ratings: any[], tvShows?: any[] };
  onLoadMore?: () => void;
  showMovies: boolean;
  showTv: boolean;
  onToggleMovies: () => void;
  onToggleTv: () => void;
}

export function TrendingMoviesCarousel({
  movies,
  onMovieSelect,
  isGrid = false,
  onToggleGrid,
  userLibrary,
  onLoadMore,
  showMovies,
  showTv,
  onToggleMovies,
  onToggleTv,
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
    <motion.section 
      layout={!isMobile}
      transition={isMobile ? { duration: 0 } : { duration: 0.5, ease: "easeInOut" }}
      className={`px-4 md:px-12 py-stack-md relative z-20 w-full ${isGrid ? 'mt-20 md:mt-24 pb-20 md:pb-24' : 'absolute bottom-0 pb-20 md:pb-8 bg-gradient-to-t from-background via-background/80 to-transparent'}`}
    >
      <motion.div layout={!isMobile} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-headline-lg text-[24px] md:text-[32px] text-white">
            {isGrid ? 'All Trending Movies & TV' : 'Trending Movies & TV Shows'}
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
        <div className="flex items-center gap-4">
          {!isGrid && (
            <motion.div 
              initial={isMobile ? undefined : { opacity: 0 }} 
              animate={isMobile ? undefined : { opacity: 1 }} 
              exit={isMobile ? undefined : { opacity: 0 }} 
              className="hidden md:flex items-center gap-2"
            >
              <button onClick={scrollLeft} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button onClick={scrollRight} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </motion.div>
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
      </motion.div>
      <motion.div 
        layout={!isMobile}
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
          : "flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar pb-8 pt-4 -mt-4 pr-4 md:pr-12 touch-pan-x"}
      >
        <AnimatePresence mode="popLayout">
          {movies.map((movie, index) => {
            const title = movie.title || movie.name || 'Unknown';
            const releaseDate = movie.release_date || movie.first_air_date || '';
            const isTv = movie.media_type === 'tv' || (!movie.title && !!movie.name);
            const userRating = userLibrary?.ratings?.find(r => r.movieId === movie.id)?.rating;
            const inWatchlist = !isTv && userLibrary?.watchlists?.some(w => w.movieId === movie.id) && !userRating;
            const isTrackedTv = isTv && userLibrary?.tvShows?.some(s => s.tmdbId === movie.id);

            return (
              <motion.div
                layout={!isMobile}
                initial={isMobile ? undefined : { opacity: 0, scale: 0.8 }}
                animate={isMobile ? undefined : { opacity: 1, scale: 1 }}
                exit={isMobile ? undefined : { opacity: 0, scale: 0.8 }}
                transition={isMobile ? { duration: 0 } : { duration: 0.4, type: "spring", bounce: 0.2 }}
                key={movie.id}
                onClick={() => onMovieSelect(movie)}
                className={`relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer hover:shadow-[0_0_20px_rgba(87,27,193,0.4)] touch-manipulation ${isGrid ? 'w-full' : 'flex-none w-[calc(33vw-20px)] md:w-48'}`}
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
                    {userRating && (
                      <div className="bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center justify-center border border-white/20 shadow-lg gap-0.5">
                        <span className="material-symbols-outlined text-[12px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-[12px] font-bold text-white">{userRating}</span>
                      </div>
                    )}
                  </div>
                
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20 pointer-events-none">
                    <div className={`backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center justify-center border shadow-lg text-[9px] font-black tracking-wider ${
                      isTv 
                        ? "bg-purple-600/90 border-purple-400/30 text-white" 
                        : "bg-yellow-500/90 border-yellow-400/30 text-black"
                    }`}>
                      {isTv ? 'S' : 'M'}
                    </div>
                  </div>

                  {index < 10 && !isGrid && (
                    <div className="absolute bottom-2 right-2 z-20 pointer-events-none bg-primary-container text-on-primary font-label-sm text-[10px] px-2 py-1 rounded-full font-bold shadow-lg border border-white/5">
                      TOP {index + 1}
                    </div>
                  )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4">
                  <div className="flex items-center gap-1 text-primary-container mb-1">
                    <span className="material-symbols-outlined text-[12px] md:text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label-sm text-[10px] md:text-label-sm">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                  </div>
                  <h3 className="font-headline-md text-[14px] md:text-[16px] text-white truncate">{title}</h3>
                  <p className="font-label-sm text-[10px] md:text-label-sm text-zinc-400 mt-1 truncate">
                    {releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )})}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}
