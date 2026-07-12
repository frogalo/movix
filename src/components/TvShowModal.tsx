"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { ImageWithLoader } from "./ImageWithLoader";
import { TrailerPlayer } from "./TrailerPlayer";

interface TvShowModalProps {
  showId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
  onLibraryUpdate?: () => void;
}

type Genre = {
  id: number;
  name: string;
};

type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type SeasonInfo = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
};

type TvShowDetails = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Genre[];
  seasons: SeasonInfo[];
  cast: CastMember[];
};

type EpisodeProgress = {
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

type TvShowData = {
  dbShow: {
    id: string;
    tvdbId: number;
    tmdbId: number | null;
    title: string;
    status: string;
    isFavorite: boolean;
    totalEpisodesTracked: number;
  } | null;
  details: TvShowDetails;
  season: {
    seasonNumber: number;
    episodes: EpisodeProgress[];
  };
};

const EMOTIONS = [
  { value: "love", emoji: "😍", label: "Love" },
  { value: "good", emoji: "😄", label: "Good" },
  { value: "wow", emoji: "😮", label: "Wow" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "angry", emoji: "😡", label: "Angry" },
  { value: "funny", emoji: "😂", label: "Funny" },
];

export function TvShowModal({
  showId,
  isOpen,
  onClose,
  onLibraryUpdate,
}: TvShowModalProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [data, setData] = useState<TvShowData | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null);
  const [isWatchlistAction, setIsWatchlistAction] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);

  // Fetch show details & default/selected season episodes
  useEffect(() => {
    if (showId && isOpen) {
      setIsLoading(true);
      fetch(`/api/tv/${showId}?season=${selectedSeason}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((tvData: TvShowData) => {
          setData(tvData);
          if (selectedSeason === 'auto') {
            setSelectedSeason(tvData.season.seasonNumber);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingLoadingFalse());
    } else {
      setData(null);
      setSelectedSeason('auto');
      setShowTrailer(false);
    }
  }, [showId, isOpen, selectedSeason]);

  const setIsLoadingLoadingFalse = () => {
    setIsLoading(false);
  };

  if (!showId || !data) return null;

  const { details, dbShow, season } = data;
  const isFavorite = dbShow?.isFavorite || false;
  const isInLibrary = !!dbShow;

  const heroImage = details.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : details.poster_path
      ? `https://image.tmdb.org/t/p/original${details.poster_path}`
      : null;

  const handleLibraryToggle = async () => {
    if (isWatchlistAction) return;
    setIsWatchlistAction(true);
    
    try {
      if (isInLibrary) {
        await fetch(`/api/tv?tvdbId=${dbShow?.tvdbId || details.id}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/tv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tvdbId: details.id,
            tmdbId: details.id,
            title: details.name,
            status: "watching",
          }),
        });
      }

      // Refetch info
      const res = await fetch(`/api/tv/${showId}?season=${selectedSeason}`);
      const updated = await res.json();
      setData(updated);
      if (onLibraryUpdate) onLibraryUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsWatchlistAction(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isInLibrary || isWatchlistAction) return;
    setIsWatchlistAction(true);

    try {
      await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow.tvdbId,
          tmdbId: details.id,
          title: details.name,
          isFavorite: !isFavorite,
        }),
      });

      // Refetch info
      const res = await fetch(`/api/tv/${showId}?season=${selectedSeason}`);
      const updated = await res.json();
      setData(updated);
      if (onLibraryUpdate) onLibraryUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsWatchlistAction(false);
    }
  };

  const handleEpisodeWatchToggle = async (episode: EpisodeProgress) => {
    const actionKey = `watch-${episode.episode_number}`;
    if (isActionInProgress) return;
    setIsActionInProgress(actionKey);

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: details.id,
          showTitle: details.name,
          seasonNumber: selectedSeason,
          episodeNumber: episode.episode_number,
          isWatched: !episode.isWatched,
        }),
      });

      // Update state locally
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          season: {
            ...prev.season,
            episodes: prev.season.episodes.map((ep) =>
              ep.episode_number === episode.episode_number
                ? { ...ep, isWatched: !ep.isWatched }
                : ep
            ),
          },
        };
      });

      if (onLibraryUpdate) onLibraryUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionInProgress(null);
    }
  };

  const handleEpisodeVote = async (episode: EpisodeProgress, emotionValue: string | null) => {
    const actionKey = `vote-${episode.episode_number}`;
    if (isActionInProgress) return;
    setIsActionInProgress(actionKey);

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: details.id,
          showTitle: details.name,
          seasonNumber: selectedSeason,
          episodeNumber: episode.episode_number,
          vote: emotionValue,
        }),
      });

      // Update state locally
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          season: {
            ...prev.season,
            episodes: prev.season.episodes.map((ep) =>
              ep.episode_number === episode.episode_number
                ? { ...ep, vote: emotionValue }
                : ep
            ),
          },
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionInProgress(null);
    }
  };

  const handleEpisodeRating = async (episode: EpisodeProgress, ratingValue: number | null) => {
    const actionKey = `rating-${episode.episode_number}`;
    if (isActionInProgress) return;
    setIsActionInProgress(actionKey);

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: details.id,
          showTitle: details.name,
          seasonNumber: selectedSeason,
          episodeNumber: episode.episode_number,
          rating: ratingValue,
        }),
      });

      // Update state locally
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          season: {
            ...prev.season,
            episodes: prev.season.episodes.map((ep) =>
              ep.episode_number === episode.episode_number
                ? { ...ep, rating: ratingValue }
                : ep
            ),
          },
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionInProgress(null);
    }
  };

  const hideTop = scrollTop > 10;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-8 overscroll-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="glass-panel relative z-10 flex h-[100dvh] w-full max-w-6xl flex-col overflow-y-auto md:overflow-hidden rounded-none md:h-auto md:max-h-[calc(100vh-4rem)] md:rounded-[2rem] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:flex-row"
          >
            <button
              onClick={onClose}
              className="fixed md:absolute right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-black/80 touch-manipulation"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Poster / Backdrop column */}
            <div 
              className="relative w-full shrink-0 overflow-hidden h-[300px] md:h-auto md:w-[40%]"
            >
              {heroImage ? (
                 <ImageWithLoader
                   src={heroImage}
                   alt={details.name}
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
                  {details.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {details.genres.slice(0, 3).map((g) => (
                    <span key={g.id} className="text-zinc-300 text-xs bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Content & Episodes column */}
            <div className="flex flex-1 flex-col overflow-visible bg-background p-4 md:p-8">
              {/* Top Section wrapper for mobile auto-hide */}
              <div className={`transition-all duration-300 ease-in-out md:max-h-none md:opacity-100 md:mb-6 md:pointer-events-auto overflow-hidden shrink-0 ${
                hideTop 
                  ? 'max-h-0 opacity-0 mb-0 pointer-events-none' 
                  : 'max-h-[300px] opacity-100 mb-4 pointer-events-auto'
              }`}>
                {/* Show Stats & Action Buttons */}
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between border-b border-white/5 pb-4 md:pb-5">
                  <div className="flex items-center gap-4 md:gap-6 overflow-x-auto hide-scrollbar">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500">First Aired</p>
                      <p className="text-sm font-semibold text-white">
                        {details.first_air_date ? new Date(details.first_air_date).getFullYear() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500">Seasons / Episodes</p>
                      <p className="text-sm font-semibold text-white">
                        {details.number_of_seasons}s / {details.number_of_episodes} eps
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500">Rating</p>
                      <p className="flex items-center gap-1 text-sm font-semibold text-white">
                        <span className="material-symbols-outlined text-xs text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        {details.vote_average ? details.vote_average.toFixed(1) : "NR"}
                      </p>
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
                        <button
                          onClick={handleFavoriteToggle}
                          disabled={isWatchlistAction}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10 ${
                            isFavorite ? "text-yellow-400" : "text-zinc-400"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]" style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}>
                            favorite
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Show Synopsis */}
                <div className="mb-3 max-h-16 md:max-h-24 overflow-y-auto text-xs md:text-sm leading-relaxed text-zinc-400">
                  {details.overview || "No synopsis available."}
                </div>

                {/* Watch Trailer Button */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] touch-manipulation"
                  >
                    <span className="material-symbols-outlined text-[16px]">movie</span>
                    Watch Trailer
                  </button>
                </div>
              </div>

              {/* Season Selection */}
              <div className="mb-3 md:mb-4 flex items-center justify-between border-b border-white/5 pb-2 md:pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-300">Season</span>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1 text-sm font-semibold text-white outline-none focus:border-yellow-400/50"
                  >
                    {details.seasons
                      .filter((s) => s.season_number > 0) // exclude specials if not wanted, or keep them
                      .map((s) => (
                        <option key={s.id} value={s.season_number}>
                          {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                        </option>
                      ))}
                  </select>
                </div>
                {dbShow && (
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {dbShow.totalEpisodesTracked} watched total
                  </span>
                )}
              </div>

              {/* Episodes List */}
              <div 
                className="flex-1 overflow-y-visible md:overflow-y-auto pr-1 pb-24 md:pb-0 space-y-3 md:space-y-4 hide-scrollbar overscroll-none"
              >
                {isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-yellow-400"></div>
                  </div>
                ) : season.episodes.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">No episodes found.</div>
                ) : (
                  season.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="glass-panel flex flex-col gap-3 md:gap-4 rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] p-3 md:p-4 transition hover:bg-white/[0.04] md:flex-row"
                    >
                      {/* Episode Thumbnail */}
                      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-lg md:rounded-xl bg-zinc-900 border border-white/5 md:w-32">
                        {ep.still_path ? (
                           <ImageWithLoader
                             src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                             alt={ep.name}
                             className="h-full w-full object-cover"
                             loaderSize={30}
                           />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-700">
                            <span className="material-symbols-outlined text-2xl">movie</span>
                          </div>
                        )}

                        <div className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          EP {ep.episode_number}
                        </div>
                      </div>

                      {/* Episode Information */}
                      <div className="flex flex-1 flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="font-semibold text-white text-sm line-clamp-1">
                              {ep.name || `Episode ${ep.episode_number}`}
                            </h4>

                            {/* Watched Action */}
                            {isLoggedIn && (
                              <button
                                onClick={() => handleEpisodeWatchToggle(ep)}
                                disabled={!!isActionInProgress}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors border ${
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
                          <div className="mt-1.5 flex items-center">
                            {(() => {
                              if (!ep.air_date) {
                                return (
                                  <span className="inline-block rounded bg-zinc-800/40 border border-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    Air date unknown
                                  </span>
                                );
                              }
                              const airDate = new Date(ep.air_date);
                              const now = new Date();
                              airDate.setHours(0,0,0,0);
                              now.setHours(0,0,0,0);
                              const diffTime = airDate.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays > 0) {
                                return (
                                  <span className="inline-block rounded bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider animate-pulse">
                                    In {diffDays} day{diffDays > 1 ? 's' : ''}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-block rounded bg-zinc-800 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                    {airDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                );
                              }
                            })()}
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-2" title={ep.overview}>
                            {ep.overview || "No description available."}
                          </p>
                        </div>

                        {/* Interactive Voting / Rating (Only if watched and logged in) */}
                        {isLoggedIn && ep.isWatched && (
                          <div className="mt-1 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between border-t border-white/5 pt-2">
                            {/* Reaction Emojis */}
                            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-1 shrink-0">Reaction:</span>
                              {EMOTIONS.map((emotion) => {
                                const isSelected = ep.vote === emotion.value;
                                return (
                                  <button
                                    key={emotion.value}
                                    onClick={() => handleEpisodeVote(ep, isSelected ? null : emotion.value)}
                                    title={emotion.label}
                                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all hover:scale-110 ${
                                      isSelected
                                        ? "bg-yellow-400/20 border border-yellow-400/40"
                                        : "bg-white/5 border border-transparent opacity-50 hover:opacity-100"
                                    }`}
                                  >
                                    {emotion.emoji}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Episode Rating */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-1">Rate:</span>
                              <select
                                value={ep.rating || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleEpisodeRating(ep, val === "" ? null : Number(val));
                                }}
                                className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-xs text-white outline-none focus:border-yellow-400/50 font-bold"
                              >
                                <option value="">-</option>
                                {[...Array(10)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>
                                    ⭐ {i + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {isOpen && data && (
      <TrailerPlayer
        movieId={details.id}
        movieTitle={details.name}
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        mediaType="tv"
      />
    )}
    </>
  );
}
