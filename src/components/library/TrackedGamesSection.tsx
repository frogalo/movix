"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { Gamepad2, Star } from "lucide-react";

interface TrackedGamesSectionProps {
  localGames: any[];
  setSelectedGameId: (id: number) => void;
  loading?: boolean;
}

export function TrackedGamesSection({
  localGames,
  setSelectedGameId,
  loading = false,
}: TrackedGamesSectionProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLAYING":
        return (
          <span className="rounded bg-yellow-400/10 border border-yellow-400/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-yellow-400">
            Playing
          </span>
        );
      case "COMPLETED":
        return (
          <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">
            Completed
          </span>
        );
      case "DROPPED":
        return (
          <span className="rounded bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-400">
            Dropped
          </span>
        );
      default:
        return (
          <span className="rounded bg-zinc-500/10 border border-zinc-500/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-400">
            Backlog
          </span>
        );
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
        <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
          <span className="material-symbols-outlined text-[32px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
            sports_esports
          </span>
          Tracked Games
        </h3>
        <span className="font-label-sm text-[12px] font-bold uppercase text-yellow-400">
          {loading ? "Loading..." : `${localGames.length} Games`}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 animate-pulse">
              <div className="aspect-[2/3] w-full bg-zinc-850" />
              <div className="flex flex-col gap-2 p-3 pt-2 pb-3.5">
                <div className="h-3 bg-zinc-850 rounded w-2/3" />
                <div className="h-4 bg-zinc-850 rounded-lg w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : localGames.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
          <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-30 text-yellow-400" />
          <p>You are not tracking any video games yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {localGames.map((game) => {
            const posterUrl = game.posterPath || null;
            return (
              <div
                key={game.id}
                onClick={() => setSelectedGameId(game.gameId)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-yellow-400/30 transition duration-300 touch-manipulation"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950 border-b border-white/5 shadow-xl">
                  {posterUrl ? (
                    <ImageWithLoader
                      src={posterUrl}
                      alt={game.title}
                      className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-700">
                      <Gamepad2 className="w-10 h-10" />
                    </div>
                  )}

                  {/* Rating Badge Overlay */}
                  {game.rating && (
                    <div className="absolute right-2 top-2 rounded-lg bg-black/85 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-white border border-white/10 flex items-center gap-1 shadow-lg z-10">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                      <span className="text-yellow-400 font-extrabold">{game.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <h4 className="text-sm font-semibold leading-snug text-white line-clamp-2 group-hover:text-yellow-400 transition-colors">
                    {game.title}
                  </h4>
                  <div className="mt-2.5 flex items-center justify-between">
                    {getStatusBadge(game.status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
