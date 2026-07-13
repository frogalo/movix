"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

interface RatingsSectionProps {
  ratedMovies: any[];
  ratingsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  setSelectedMovie: (movie: any) => void;
  setPage: (type: "ratings" | "shows", pageNum: number) => void;
}

export function RatingsSection({
  ratedMovies,
  ratingsPagination,
  setSelectedMovie,
  setPage,
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
                    <ImageWithLoader
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
  );
}
