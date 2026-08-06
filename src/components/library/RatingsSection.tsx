"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

interface RatingsSectionProps {
  ratedMovies: any[];
  ratingsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  } | null;
  setSelectedMovie: (movie: any) => void;
  setPage: (type: "ratings" | "shows", pageNum: number) => void;
  loading?: boolean;
  isLoadingMore?: boolean;
}

export function RatingsSection({
  ratedMovies,
  ratingsPagination,
  setSelectedMovie,
  setPage,
  loading = false,
  isLoadingMore = false,
}: RatingsSectionProps) {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
        <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
          <span className="material-symbols-outlined text-[32px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
          Your Movie Ratings
        </h3>
        <span className="font-label-sm text-[12px] font-bold uppercase text-yellow-400">
          {loading ? "Loading..." : `${ratingsPagination?.totalItems || 0} Ratings`}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl bg-zinc-900/40 p-2.5 border border-white/5 animate-pulse">
              <div className="aspect-[2/3] w-full bg-zinc-850 rounded-xl" />
              <div className="h-3 bg-zinc-850 rounded w-2/3 mx-auto mt-1" />
            </div>
          ))}
        </div>
      ) : ratedMovies.length === 0 ? (
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
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-950 border border-white/5 shadow-xl transition-all duration-300 group-hover:scale-105 z-10 group-hover:z-30">
                  {m.poster_path ? (
                    <ImageWithLoader
                      src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                      alt={m.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <span className="material-symbols-outlined">movie</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border border-white/10">
                    <span className="material-symbols-outlined text-[12px] text-yellow-400 transition-transform duration-500 ease-out group-hover:scale-125 group-hover:rotate-[15deg]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-xs font-bold text-white transition-transform duration-500 ease-out group-hover:scale-105 inline-block">{m.userRating}/10</span>
                  </div>
                </div>
                <h4 className="text-white text-xs font-semibold truncate px-1" title={m.title}>
                  {m.title}
                </h4>
              </div>
            ))}
          </div>

          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-yellow-400"></div>
            </div>
          )}

          {ratingsPagination && ratingsPagination.currentPage < ratingsPagination.totalPages && !isLoadingMore && (
            <div className="flex justify-center pt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPage("ratings", ratingsPagination.currentPage + 1);
                }}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Show More (+10 Movies)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
