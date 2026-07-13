"use client";

import { VotingComponent } from "@/components/common/VotingComponent";

interface TvShowStatsAndActionsProps {
  firstAirDate: string;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  voteAverage: number;
  isLoggedIn: boolean;
  isInLibrary: boolean;
  isFavorite: boolean;
  isWatchlistAction: boolean;
  isActionInProgress: boolean;
  dbShowVote: string | null;
  dbShowRating: number | null;
  handleLibraryToggle: () => Promise<void>;
  handleFavoriteToggle: () => Promise<void>;
  handleSeriesVote: (vote: string | null) => Promise<void>;
  handleSeriesRating: (rating: number | null) => Promise<void>;
}

export function TvShowStatsAndActions({
  firstAirDate,
  numberOfSeasons,
  numberOfEpisodes,
  voteAverage,
  isLoggedIn,
  isInLibrary,
  isFavorite,
  isWatchlistAction,
  isActionInProgress,
  dbShowVote,
  dbShowRating,
  handleLibraryToggle,
  handleFavoriteToggle,
  handleSeriesVote,
  handleSeriesRating,
}: TvShowStatsAndActionsProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between border-b border-white/5 pb-4 md:pb-5">
      <div className="flex items-center justify-start gap-2.5 md:gap-4 overflow-x-auto hide-scrollbar border border-white/5 bg-white/[0.02] px-3.5 py-2 rounded-2xl w-fit shrink-0 mx-auto md:mx-0">
        <div className="flex flex-col gap-0.5 min-w-[60px] text-center md:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">First Aired</span>
          <span className="text-xs md:text-sm font-extrabold text-white leading-none h-5 flex items-center justify-center md:justify-start">
            {firstAirDate ? new Date(firstAirDate).getFullYear() : "N/A"}
          </span>
        </div>
        <div className="h-6 w-px bg-white/10 shrink-0" />
        <div className="flex flex-col gap-0.5 min-w-[45px] text-center md:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Seasons</span>
          <span className="text-xs md:text-sm font-extrabold text-white leading-none h-5 flex items-center justify-center md:justify-start">
            {numberOfSeasons}
          </span>
        </div>
        <div className="h-6 w-px bg-white/10 shrink-0" />
        <div className="flex flex-col gap-0.5 min-w-[50px] text-center md:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Episodes</span>
          <span className="text-xs md:text-sm font-extrabold text-white leading-none h-5 flex items-center justify-center md:justify-start">
            {numberOfEpisodes}
          </span>
        </div>
        <div className="h-6 w-px bg-white/10 shrink-0" />
        <div className="flex flex-col gap-0.5 min-w-[45px] text-center md:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Rating</span>
          <div className="flex items-center justify-center md:justify-start gap-1 h-5">
            <span className="material-symbols-outlined text-[15px] text-yellow-400 font-extrabold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-xs md:text-sm font-extrabold text-white leading-none">
              {voteAverage ? voteAverage.toFixed(1) : "NR"}
            </span>
          </div>
        </div>
      </div>

      {isLoggedIn && (
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleLibraryToggle}
            disabled={isWatchlistAction}
            className={`flex items-center gap-1.5 md:gap-2 rounded-xl border px-3 md:px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors touch-manipulation ${
              isInLibrary
                ? "bg-zinc-800 border-white/10 text-white hover:bg-zinc-700"
                : "bg-yellow-400 border-transparent text-black hover:bg-yellow-300"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isInLibrary ? "bookmark_remove" : "bookmark"}
            </span>
            {isInLibrary ? "Untrack" : "Track Show"}
          </button>

          {isInLibrary && (
            <>
              <button
                onClick={handleFavoriteToggle}
                disabled={isWatchlistAction}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10 shrink-0 ${
                  isFavorite ? "text-yellow-400" : "text-zinc-400"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  favorite
                </span>
              </button>

              <div className="flex items-center border-l border-white/10 pl-2 ml-1">
                <VotingComponent
                  vote={dbShowVote}
                  rating={dbShowRating}
                  onVoteChange={handleSeriesVote}
                  onRatingChange={handleSeriesRating}
                  isActionInProgress={isActionInProgress}
                  label="Series"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
