"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

type Genre = {
  id: number;
  name: string;
};

interface TvShowModalHeroProps {
  name: string;
  backdropPath: string | null;
  posterPath: string | null;
  genres: Genre[];
}

export function TvShowModalHero({
  name,
  backdropPath,
  posterPath,
  genres,
}: TvShowModalHeroProps) {
  const heroImage = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : posterPath
      ? `https://image.tmdb.org/t/p/original${posterPath}`
      : null;

  return (
    <div className="relative w-full shrink-0 overflow-hidden h-[300px] md:h-auto md:w-[40%]">
      {heroImage ? (
        <ImageWithLoader
          src={heroImage}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          loaderSize={60}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <span className="material-symbols-outlined text-7xl text-zinc-700">tv</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/85" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,204,0,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(87,27,193,0.25),transparent_45%)]" />

      {/* Poster info overlays */}
      <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3 md:bottom-8 md:left-8">
        <span className="self-start rounded-full bg-yellow-400 px-3 py-1 font-label-sm text-[10px] font-black uppercase tracking-wider text-black">
          TV Series
        </span>
        <h3 className="font-headline-lg text-[28px] font-bold leading-tight text-white drop-shadow-xl md:text-[36px]">
          {name}
        </h3>
        <div className="flex flex-wrap gap-2">
          {genres.slice(0, 3).map((g) => (
            <span key={g.id} className="text-zinc-300 text-xs bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
              {g.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
