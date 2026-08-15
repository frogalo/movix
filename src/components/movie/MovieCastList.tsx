"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

interface MovieCastListProps {
  isLoading: boolean;
  cast?: CastMember[];
  onSelectActor?: (actorId: number) => void;
}

export function MovieCastList({ isLoading, cast, onSelectActor }: MovieCastListProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-headline-md text-xl text-white">Top Cast</h3>
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="flex shrink-0 flex-col items-center gap-2">
              <div className="h-16 w-16 animate-pulse rounded-full bg-white/10" />
              <div className="h-2 w-20 animate-pulse rounded bg-white/10" />
              <div className="h-2 w-14 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : cast?.length ? (
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {cast.map((actor) => (
            <div
              key={actor.id}
              onClick={() => onSelectActor && onSelectActor(actor.id)}
              className={`group flex shrink-0 flex-col items-center gap-2 ${
                onSelectActor ? "cursor-pointer" : ""
              }`}
              title={onSelectActor ? `View ${actor.name}` : undefined}
            >
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-transparent transition-all duration-200 group-hover:border-primary-container group-hover:scale-105 shadow-md">
                {actor.profile_path ? (
                  <ImageWithLoader
                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                    alt={actor.name}
                    className="h-full w-full object-cover"
                    loaderSize={24}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="w-20 truncate text-[11px] font-semibold text-white group-hover:text-primary-container transition-colors">
                  {actor.name}
                </p>
                <p className="w-20 truncate text-[10px] text-zinc-500">
                  {actor.character}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No cast information available.</p>
      )}
    </div>
  );
}
