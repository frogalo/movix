"use client";

import { useEffect, useState } from "react";
import { Movie } from "@/components/TrendingMoviesCarousel";

type ApiResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};

export default function Discovery() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch(`/api/trending?page=2`) // Using page 2 for different movies from Home
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setMovies(data.results);
      });
  }, []);

  const handleNext = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Loop back or fetch more
      setCurrentIndex(0);
    }
  };

  const currentMovie = movies[currentIndex];

  return (
    <main className="md:ml-64 w-full md:w-[calc(100%-16rem)] relative h-screen overflow-hidden flex flex-col bg-[#131318]">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between px-5 md:px-16 pt-20 md:pt-12 pb-4 md:pb-6">
        <h1 className="text-2xl md:text-4xl font-bold font-['Space_Grotesk'] tracking-tight text-white">Discover</h1>
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800/50 border border-white/10 flex items-center justify-center hover:bg-zinc-700/50 active:bg-zinc-600/50 transition-colors touch-manipulation">
          <span className="material-symbols-outlined text-zinc-300">tune</span>
        </button>
      </div>

      {/* Card Container */}
      <div className="flex-1 w-full flex items-center justify-center relative px-4">
        {currentMovie ? (
          <div className="relative w-full max-w-[420px] h-[60vh] md:h-[600px] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group cursor-grab active:cursor-grabbing">
            <img 
              src={currentMovie.poster_path ? `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}` : ''} 
              alt={currentMovie.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            {/* Top Badges */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <span className="material-symbols-outlined text-[14px] text-purple-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-white text-sm font-bold">{currentMovie.vote_average?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white">Sci-Fi</span>
                <span className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white">Drama</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 flex flex-col gap-2">
              <h2 className="text-2xl md:text-4xl font-bold text-white font-['Space_Grotesk'] leading-tight drop-shadow-lg line-clamp-2">{currentMovie.title || currentMovie.name}</h2>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2 font-['Inter']">
                <span>{currentMovie.release_date ? new Date(currentMovie.release_date).getFullYear() : ''}</span>
                <span>•</span>
                <span>2h 14m</span>
              </div>
              <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 md:line-clamp-3 font-['Inter']">
                {currentMovie.overview}
              </p>
            </div>
            
            {/* Next Indicator */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
              <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">chevron_right</span>
              <span className="text-white text-[10px] tracking-widest mt-1 drop-shadow-md font-bold">NEXT</span>
            </div>
          </div>
        ) : (
          <div className="text-white">Loading discoveries...</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 md:gap-6 pb-24 md:pb-16 pt-4 md:pt-6">
        <button onClick={handleNext} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all shadow-lg text-red-400 touch-manipulation">
          <span className="material-symbols-outlined text-[22px] md:text-[24px]">close</span>
        </button>
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all shadow-lg text-purple-300 touch-manipulation">
          <span className="material-symbols-outlined text-[18px] md:text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
        </button>
        <button onClick={handleNext} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#f1c100] flex items-center justify-center hover:bg-yellow-300 active:scale-95 transition-all shadow-[0_0_30px_rgba(241,193,0,0.4)] text-black touch-manipulation">
          <span className="material-symbols-outlined text-[28px] md:text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
        </button>
      </div>
    </main>
  );
}
