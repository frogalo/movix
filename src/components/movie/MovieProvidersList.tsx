"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";

export type StreamingProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

interface MovieProvidersListProps {
  isLoading: boolean;
  providers?: StreamingProvider[];
}

export function MovieProvidersList({ isLoading, providers }: MovieProvidersListProps) {
  return (
    <div className="space-y-4 border-t border-white/10 pt-6">
      <p className="text-label-sm uppercase tracking-[0.24em] text-zinc-500">
        Available To Watch On
      </p>
      {isLoading ? (
        <div className="flex gap-3">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-11 w-11 animate-pulse rounded-xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : providers?.length ? (
        <div className="flex flex-wrap gap-3">
          {providers.map((provider) => (
            <ImageWithLoader
              key={provider.provider_id}
              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
              alt={provider.provider_name}
              title={provider.provider_name}
              className="h-full w-full rounded-xl border border-white/10 bg-surface-container object-cover shadow-lg"
              wrapperClassName="h-11 w-11 shrink-0"
              loaderSize={20}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Not available on streaming.</p>
      )}
    </div>
  );
}
