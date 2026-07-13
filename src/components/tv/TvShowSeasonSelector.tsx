"use client";

type SeasonInfo = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
};

interface TvShowSeasonSelectorProps {
  seasons: SeasonInfo[];
  selectedSeason: number | "auto";
  setSelectedSeason: (season: number) => void;
  isLoggedIn: boolean;
  dbShow: {
    totalEpisodesTracked: number;
  } | null;
  isCurrentSeasonAllWatched: boolean;
  isEntireSeriesAllWatched: boolean;
  isActionInProgress: boolean;
  handleMarkSeasonWatched: () => Promise<void>;
  handleMarkSeriesWatched: () => Promise<void>;
}

export function TvShowSeasonSelector({
  seasons,
  selectedSeason,
  setSelectedSeason,
  isLoggedIn,
  dbShow,
  isCurrentSeasonAllWatched,
  isEntireSeriesAllWatched,
  isActionInProgress,
  handleMarkSeasonWatched,
  handleMarkSeriesWatched,
}: TvShowSeasonSelectorProps) {
  return (
    <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between min-w-0">
        {/* Left Side: Dropdown select */}
        <div className="flex flex-1 md:flex-initial items-center justify-between md:justify-start gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-1 md:flex-initial min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 shrink-0">Season</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="w-full md:w-auto min-w-0 md:min-w-[140px] rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-yellow-400/50 cursor-pointer truncate"
            >
              {seasons
                .filter((s) => s.season_number > 0)
                .map((s) => (
                  <option key={s.id} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                  </option>
                ))}
            </select>
          </div>
          {dbShow && (
            <span className="text-xs font-bold text-zinc-500 md:hidden bg-white/5 px-2.5 py-1 rounded-lg">
              {dbShow.totalEpisodesTracked} watched
            </span>
          )}
        </div>

        {/* Right Side: Bulk actions */}
        {isLoggedIn && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {!isCurrentSeasonAllWatched && (
              <button
                onClick={handleMarkSeasonWatched}
                disabled={isActionInProgress}
                className="flex-1 md:flex-initial flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white cursor-pointer touch-manipulation whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[15px]">done_all</span>
                Mark Season Watched
              </button>
            )}
            {!isEntireSeriesAllWatched && (
              <button
                onClick={handleMarkSeriesWatched}
                disabled={isActionInProgress}
                className="flex-1 md:flex-initial flex h-9 items-center justify-center gap-1.5 rounded-xl border border-yellow-400/25 bg-yellow-400/5 px-3 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400/10 cursor-pointer touch-manipulation whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[15px]">done_all</span>
                Mark Series Watched
              </button>
            )}
            {dbShow && (
              <span className="hidden md:inline-block text-xs font-bold text-zinc-500 uppercase tracking-wider ml-2 whitespace-nowrap">
                {dbShow.totalEpisodesTracked} watched total
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
