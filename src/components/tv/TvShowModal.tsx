"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { TrailerPlayer } from "@/components/common/TrailerPlayer";
import { TvShowModalHero } from "./TvShowModalHero";
import { TvShowStatsAndActions } from "./TvShowStatsAndActions";
import { TvShowSeasonSelector } from "./TvShowSeasonSelector";
import { TvShowEpisodeCard, EpisodeProgress } from "./TvShowEpisodeCard";

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

type TvShowData = {
  dbShow: {
    id: string;
    tvdbId: number;
    tmdbId: number | null;
    title: string;
    status: string;
    isFavorite: boolean;
    totalEpisodesTracked: number;
    vote: string | null;
    rating: number | null;
  } | null;
  details: TvShowDetails;
  season: {
    seasonNumber: number;
    episodes: EpisodeProgress[];
  };
};

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
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
      setSelectedSeason('auto');
      setShowTrailer(false);
    }
  }, [showId, isOpen, selectedSeason]);

  if (!showId || !data) return null;

  const { details, dbShow, season } = data;
  const isFavorite = dbShow?.isFavorite || false;
  const isInLibrary = !!dbShow;

  const isCurrentSeasonAllWatched = season?.episodes?.length > 0 && season.episodes.every((ep) => ep.isWatched);
  const totalRegularEpisodes = details.seasons
    ?.filter((s) => s.season_number > 0)
    ?.reduce((sum, s) => sum + s.episode_count, 0) || 0;
  const isEntireSeriesAllWatched = dbShow ? dbShow.totalEpisodesTracked >= totalRegularEpisodes : false;

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

  const handleSeriesVote = async (emotionValue: string | null) => {
    if (!isInLibrary || isActionInProgress) return;
    setIsActionInProgress("series-vote");

    try {
      await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow.tvdbId,
          tmdbId: details.id,
          title: details.name,
          vote: emotionValue,
        }),
      });

      setData((prev) => {
        if (!prev || !prev.dbShow) return prev;
        return {
          ...prev,
          dbShow: {
            ...prev.dbShow,
            vote: emotionValue,
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

  const handleSeriesRating = async (ratingValue: number | null) => {
    if (!isInLibrary || isActionInProgress) return;
    setIsActionInProgress("series-rating");

    try {
      await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow.tvdbId,
          tmdbId: details.id,
          title: details.name,
          rating: ratingValue,
        }),
      });

      setData((prev) => {
        if (!prev || !prev.dbShow) return prev;
        return {
          ...prev,
          dbShow: {
            ...prev.dbShow,
            rating: ratingValue,
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

  const handleMarkSeasonWatched = async () => {
    if (isActionInProgress) return;
    setIsActionInProgress("mark-season-watched");

    const currentSeasonMeta = details.seasons.find((s) => s.season_number === selectedSeason);
    const episodeCount = currentSeasonMeta ? currentSeasonMeta.episode_count : 0;

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: details.id,
          showTitle: details.name,
          seasonNumber: selectedSeason,
          episodeCount: episodeCount,
          isWatched: true,
          bulk: "season",
        }),
      });

      const res = await fetch(`/api/tv/${showId}?season=${selectedSeason}`);
      const updated = await res.json();
      setData(updated);
      if (onLibraryUpdate) onLibraryUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionInProgress(null);
    }
  };

  const handleMarkSeriesWatched = async () => {
    if (isActionInProgress) return;
    setIsActionInProgress("mark-series-watched");

    const seasonsData = details.seasons
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
      }));

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: details.id,
          showTitle: details.name,
          seasonsData,
          isWatched: true,
          bulk: "series",
        }),
      });

      const res = await fetch(`/api/tv/${showId}?season=${selectedSeason}`);
      const updated = await res.json();
      setData(updated);
      if (onLibraryUpdate) onLibraryUpdate();
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

              <TvShowModalHero
                name={details.name}
                backdropPath={details.backdrop_path}
                posterPath={details.poster_path}
                genres={details.genres}
              />

              {/* Content & Episodes column */}
              <div 
                className="flex flex-1 flex-col overflow-visible bg-background p-4 md:p-8"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              >
                {/* Top Section wrapper for mobile auto-hide */}
                <div className={`transition-all duration-300 ease-in-out md:max-h-none md:opacity-100 md:mb-6 md:pointer-events-auto overflow-hidden shrink-0 ${
                  hideTop 
                    ? 'max-h-0 opacity-0 mb-0 pointer-events-none' 
                    : 'max-h-[300px] opacity-100 mb-4 pointer-events-auto'
                }`}>
                  <TvShowStatsAndActions
                    firstAirDate={details.first_air_date}
                    numberOfSeasons={details.number_of_seasons}
                    numberOfEpisodes={details.number_of_episodes}
                    voteAverage={details.vote_average}
                    isLoggedIn={isLoggedIn}
                    isInLibrary={isInLibrary}
                    isFavorite={isFavorite}
                    isWatchlistAction={isWatchlistAction}
                    isActionInProgress={isActionInProgress !== null}
                    dbShowVote={dbShow?.vote || null}
                    dbShowRating={dbShow?.rating || null}
                    handleLibraryToggle={handleLibraryToggle}
                    handleFavoriteToggle={handleFavoriteToggle}
                    handleSeriesVote={handleSeriesVote}
                    handleSeriesRating={handleSeriesRating}
                  />

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

                <TvShowSeasonSelector
                  seasons={details.seasons}
                  selectedSeason={selectedSeason}
                  setSelectedSeason={setSelectedSeason}
                  isLoggedIn={isLoggedIn}
                  dbShow={dbShow}
                  isCurrentSeasonAllWatched={isCurrentSeasonAllWatched}
                  isEntireSeriesAllWatched={isEntireSeriesAllWatched}
                  isActionInProgress={isActionInProgress !== null}
                  handleMarkSeasonWatched={handleMarkSeasonWatched}
                  handleMarkSeriesWatched={handleMarkSeriesWatched}
                />

                {/* Episodes List */}
                <div className="flex-1 overflow-y-visible md:overflow-y-auto pr-1 pb-24 md:pb-0 space-y-3 md:space-y-4 hide-scrollbar overscroll-none">
                  {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-yellow-400"></div>
                    </div>
                  ) : season.episodes.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500">No episodes found.</div>
                  ) : (
                    season.episodes.map((ep) => (
                      <TvShowEpisodeCard
                        key={ep.id}
                        ep={ep}
                        isLoggedIn={isLoggedIn}
                        isActionInProgress={isActionInProgress !== null}
                        handleEpisodeWatchToggle={handleEpisodeWatchToggle}
                        handleEpisodeVote={handleEpisodeVote}
                        handleEpisodeRating={handleEpisodeRating}
                      />
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
