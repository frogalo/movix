"use client";

import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { VotingComponent } from "@/components/common/VotingComponent";

export type EpisodeProgress = {
  id: number;
  name: string;
  episode_number: number;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  isWatched: boolean;
  watchedAt: string | null;
  rating: number | null;
  vote: string | null;
};

interface TvShowEpisodeCardProps {
  ep: EpisodeProgress;
  isLoggedIn: boolean;
  isActionInProgress: boolean;
  handleEpisodeWatchToggle: (episode: EpisodeProgress) => Promise<void>;
  handleEpisodeVote: (episode: EpisodeProgress, vote: string | null) => Promise<void>;
  handleEpisodeRating: (episode: EpisodeProgress, rating: number | null) => Promise<void>;
  isHighlighted?: boolean;
}

export function TvShowEpisodeCard({
  ep,
  isLoggedIn,
  isActionInProgress,
  handleEpisodeWatchToggle,
  handleEpisodeVote,
  handleEpisodeRating,
  isHighlighted = false,
}: TvShowEpisodeCardProps) {
  const isEpisodeFuture = ep.air_date ? new Date(ep.air_date).getTime() > Date.now() : false;

  const renderAirDateBadge = () => {
    if (!ep.air_date) {
      return (
        <span className="inline-block rounded bg-zinc-800/40 border border-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Air date unknown
        </span>
      );
    }
    const airDate = new Date(ep.air_date);
    const now = new Date();
    airDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = airDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return (
        <span className="inline-block rounded bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider animate-pulse">
          In {diffDays} day{diffDays > 1 ? "s" : ""}
        </span>
      );
    } else {
      return (
        <span className="inline-block rounded bg-zinc-800 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
          {airDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      );
    }
  };

  return (
    <div
      id={`episode-card-${ep.episode_number}`}
      className={`glass-panel flex flex-col overflow-hidden rounded-2xl transition-all duration-300 md:flex-row ${
        isHighlighted
          ? "border-yellow-400 bg-yellow-500/[0.06] shadow-[0_0_25px_rgba(250,204,21,0.2)] ring-1 ring-yellow-400/30"
          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      {/* Episode Thumbnail */}
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-zinc-900 md:w-36 md:h-auto md:aspect-video">
        {ep.still_path ? (
          <ImageWithLoader
            src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
            alt={ep.name}
            className="h-full w-full object-cover"
            loaderSize={30}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-700 bg-zinc-900">
            <span className="material-symbols-outlined text-2xl">movie</span>
          </div>
        )}

        <div className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white z-10">
          EP {ep.episode_number}
        </div>
      </div>

      {/* Episode Information */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h4 className="font-semibold text-white text-sm line-clamp-1">
              {ep.name || `Episode ${ep.episode_number}`}
            </h4>

            <div className="flex items-center gap-2 shrink-0">
              {/* Interactive Voting / Rating (Only if watched and logged in) */}
              {isLoggedIn && ep.isWatched && (
                <VotingComponent
                  vote={ep.vote}
                  rating={ep.rating}
                  onVoteChange={(v) => handleEpisodeVote(ep, v)}
                  onRatingChange={(r) => handleEpisodeRating(ep, r)}
                  isActionInProgress={isActionInProgress}
                  label={`Episode ${ep.episode_number}`}
                />
              )}

              {/* Watched Action */}
              {isLoggedIn && (!isEpisodeFuture || ep.isWatched) && (
                <button
                  onClick={() => handleEpisodeWatchToggle(ep)}
                  disabled={isActionInProgress}
                  className={`flex h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 border shrink-0 ${
                    ep.isWatched
                      ? "bg-yellow-400/20 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/30"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]" style={ep.isWatched ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    visibility
                  </span>
                  {ep.isWatched ? "Watched" : "Watch"}
                </button>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center">
            {renderAirDateBadge()}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-2" title={ep.overview}>
            {ep.overview || "No description available."}
          </p>
        </div>
      </div>
    </div>
  );
}
