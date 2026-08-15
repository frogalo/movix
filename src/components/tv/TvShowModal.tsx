"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { TrailerPlayer } from "@/components/common/TrailerPlayer";
import { MovieCastList } from "@/components/movie/MovieCastList";
import { ActorModal } from "@/components/person/ActorModal";
import { TvShowModalHero } from "./TvShowModalHero";
import { TvShowStatsAndActions } from "./TvShowStatsAndActions";
import { TvShowSeasonSelector } from "./TvShowSeasonSelector";
import { TvShowEpisodeCard, EpisodeProgress } from "./TvShowEpisodeCard";

interface TvShowModalProps {
  showId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
  onLibraryUpdate?: () => void;
  initialSeason?: number | null;
  highlightEpisode?: number | null;
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

import { TrophyShowcase } from "@/components/common/TrophyShowcase";
import { AwardsSummary } from "@/lib/awards";

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
  awards?: AwardsSummary;
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
  initialSeason = null,
  highlightEpisode = null,
}: TvShowModalProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [activeShowId, setActiveShowId] = useState<string | number | null>(showId);
  const [data, setData] = useState<TvShowData | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null);
  const [isWatchlistAction, setIsWatchlistAction] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasScrolledToEpisode, setHasScrolledToEpisode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveShowId(showId);
  }, [showId]);

  useEffect(() => {
    if (isOpen && initialSeason !== null && initialSeason !== undefined) {
      setSelectedSeason(initialSeason);
    } else if (!isOpen) {
      setSelectedSeason('auto');
    }
  }, [isOpen, initialSeason]);

  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToEpisode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isLoading && data && highlightEpisode && !hasScrolledToEpisode) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`episode-card-${highlightEpisode}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHasScrolledToEpisode(true);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoading, data, highlightEpisode, hasScrolledToEpisode]);

  useEffect(() => {
    if (activeShowId && isOpen) {
      setIsLoading(true);
      fetch(`/api/tv/${activeShowId}?season=${selectedSeason}`)
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
  }, [activeShowId, isOpen, selectedSeason]);

  if (!activeShowId) return null;

  const details = data?.details;
  const dbShow = data?.dbShow;
  const season = data?.season;
  const isFavorite = dbShow?.isFavorite || false;
  const isInLibrary = !!dbShow;

  const isCurrentSeasonAllWatched = season?.episodes ? season.episodes.length > 0 && season.episodes.every((ep) => ep.isWatched) : false;
  const totalRegularEpisodes = details?.seasons
    ?.filter((s) => s.season_number > 0)
    ?.reduce((sum, s) => sum + s.episode_count, 0) || 0;
  const isEntireSeriesAllWatched = dbShow ? dbShow.totalEpisodesTracked >= totalRegularEpisodes : false;

  const handleLibraryToggle = async () => {
    if (!data?.details || isWatchlistAction) return;
    setIsWatchlistAction(true);
    
    try {
      if (isInLibrary) {
        await fetch(`/api/tv?tvdbId=${dbShow?.tvdbId || data.details.id}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/tv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tvdbId: data.details.id,
            tmdbId: data.details.id,
            title: data.details.name,
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
    if (!isInLibrary || !dbShow || !data?.details || isWatchlistAction) return;
    setIsWatchlistAction(true);

    try {
      await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow.tvdbId,
          tmdbId: data.details.id,
          title: data.details.name,
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
    if (!data?.details) return;
    const actionKey = `watch-${episode.episode_number}`;
    if (isActionInProgress) return;
    setIsActionInProgress(actionKey);

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: data.details.id,
          showTitle: data.details.name,
          seasonNumber: selectedSeason,
          episodeNumber: episode.episode_number,
          isWatched: !episode.isWatched,
        }),
      });

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
    if (!data?.details) return;
    const actionKey = `vote-${episode.episode_number}`;
    if (isActionInProgress) return;
    setIsActionInProgress(actionKey);

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: data.details.id,
          showTitle: data.details.name,
          seasonNumber: selectedSeason,
          episodeNumber: episode.episode_number,
          vote: emotionValue,
        }),
      });

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
    if (!data?.details) return;
    const actionKey = `rating-${episode.episode_number}`;
    if (isActionInProgress) return;
    setIsActionInProgress(actionKey);

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: data.details.id,
          showTitle: data.details.name,
          seasonNumber: selectedSeason,
          episodeNumber: episode.episode_number,
          rating: ratingValue,
        }),
      });

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
    if (!isInLibrary || !dbShow || !data?.details || isActionInProgress) return;
    setIsActionInProgress("series-vote");

    try {
      await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow.tvdbId,
          tmdbId: data.details.id,
          title: data.details.name,
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionInProgress(null);
    }
  };

  const handleSeriesRating = async (ratingValue: number | null) => {
    if (!isInLibrary || !dbShow || !data?.details || isActionInProgress) return;
    setIsActionInProgress("series-rating");

    try {
      await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow.tvdbId,
          tmdbId: data.details.id,
          title: data.details.name,
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionInProgress(null);
    }
  };

  const handleMarkSeasonWatched = async () => {
    if (!data?.details || isActionInProgress) return;
    setIsActionInProgress(`mark-season-${selectedSeason}`);

    const currentSeasonMeta = data.details.seasons.find((s) => s.season_number === selectedSeason);
    const episodeCount = currentSeasonMeta ? currentSeasonMeta.episode_count : 0;

    try {
      await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvdbId: dbShow?.tvdbId || null,
          tmdbId: data.details.id,
          showTitle: data.details.name,
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
    if (!data?.details || isActionInProgress) return;
    setIsActionInProgress("mark-series-watched");

    const seasonsData = data.details.seasons
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
          tmdbId: data.details.id,
          showTitle: data.details.name,
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

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-8 overscroll-none">
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
              className="glass-panel relative z-10 flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none md:h-auto md:max-h-[calc(100vh-4rem)] md:rounded-[2rem] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
            >
              <button
                onClick={onClose}
                className="fixed md:absolute right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-black/80 touch-manipulation"
                style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {(!data || isLoading || !details) ? (
                <div className="flex-1 overflow-y-auto md:overflow-hidden h-full flex flex-col md:flex-row animate-pulse">
                  <div className="relative w-full shrink-0 overflow-hidden h-[300px] md:h-auto md:w-[44%] bg-zinc-900 flex flex-col justify-end p-6">
                    <div className="space-y-2 md:hidden">
                      <div className="h-5 w-24 rounded-full bg-zinc-800" />
                      <div className="h-8 w-48 rounded-xl bg-zinc-800" />
                      <div className="h-4 w-32 rounded-md bg-zinc-800/80" />
                    </div>
                  </div>
                  <div className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto">
                    <div className="hidden md:block space-y-3">
                      <div className="h-6 w-28 rounded-full bg-zinc-800" />
                      <div className="h-9 w-64 rounded-xl bg-zinc-800" />
                      <div className="h-4 w-44 rounded-md bg-zinc-800/70" />
                    </div>
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-zinc-800" />
                      <div className="h-16 flex-1 rounded-2xl bg-zinc-800/60" />
                    </div>
                    <div className="rounded-2xl bg-zinc-900/40 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-16 rounded bg-amber-400/20" />
                          <div className="h-4 w-24 rounded bg-zinc-800" />
                        </div>
                        <div className="h-5 w-16 rounded-full bg-zinc-800/60" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-32 rounded-xl bg-zinc-800/60" />
                        <div className="h-6 w-24 rounded-xl bg-zinc-800/60" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-8 w-48 rounded-xl bg-zinc-800/70" />
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 rounded-xl bg-zinc-900/80" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto md:overflow-hidden h-full flex flex-col md:flex-row">
                  <TvShowModalHero
                    name={details.name}
                    backdropPath={details.backdrop_path}
                    posterPath={details.poster_path}
                    genres={details.genres}
                  />

                  <div 
                    className="flex flex-1 flex-col overflow-visible md:overflow-y-auto bg-background p-4 md:p-8"
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                  >
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

                      <div className="mb-3 max-h-16 md:max-h-24 overflow-y-auto text-xs md:text-sm leading-relaxed text-zinc-400">
                        {details.overview || "No synopsis available."}
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setShowTrailer(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] touch-manipulation"
                        >
                          <span className="material-symbols-outlined text-[16px]">movie</span>
                          Watch Trailer
                        </button>
                        {details.awards?.hasAwards && (
                          <TrophyShowcase awards={details.awards} variant="badge-only" />
                        )}
                      </div>

                      {details.awards?.hasAwards && (
                        <div className="mb-5">
                          <TrophyShowcase
                            awards={details.awards}
                            title={details.name}
                            onAwardClick={async (award) => {
                              if (!award.recipient) return;
                              const recipientName = award.recipient.trim().toLowerCase();
                              const castMatch = details.cast?.find((c: any) => {
                                const name = (c.name || '').toLowerCase();
                                return name === recipientName || name.includes(recipientName) || recipientName.includes(name);
                              });
                              if (castMatch?.id) {
                                setSelectedActorId(castMatch.id);
                                return;
                              }
                              try {
                                const res = await fetch(`/api/search?q=${encodeURIComponent(award.recipient)}`);
                                if (res.ok) {
                                  const searchData = await res.json();
                                  const personMatch = searchData.results?.find((r: any) => r.media_type === 'person') || searchData.results?.[0];
                                  if (personMatch?.id) {
                                    setSelectedActorId(personMatch.id);
                                  }
                                }
                              } catch (e) {
                                console.error('[AWARD_CLICK_TV_SEARCH_ERROR]', e);
                              }
                            }}
                          />
                        </div>
                      )}

                      {details.cast && details.cast.length > 0 && (
                        <div className="mb-4">
                          <MovieCastList
                            isLoading={isLoading}
                            cast={details.cast}
                            onSelectActor={(actorId) => setSelectedActorId(actorId)}
                          />
                        </div>
                      )}
                    </div>

                    <TvShowSeasonSelector
                      seasons={details.seasons}
                      selectedSeason={selectedSeason}
                      setSelectedSeason={setSelectedSeason}
                      isLoggedIn={isLoggedIn}
                      dbShow={dbShow || null}
                      isCurrentSeasonAllWatched={isCurrentSeasonAllWatched}
                      isEntireSeriesAllWatched={isEntireSeriesAllWatched}
                      isActionInProgress={isActionInProgress !== null}
                      handleMarkSeasonWatched={handleMarkSeasonWatched}
                      handleMarkSeriesWatched={handleMarkSeriesWatched}
                    />

                    <div className="flex-1 overflow-y-visible md:overflow-y-auto pr-1 pb-24 md:pb-0 space-y-3 md:space-y-4 hide-scrollbar overscroll-none">
                      {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-yellow-400"></div>
                        </div>
                      ) : !season || season.episodes.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500">No episodes found.</div>
                      ) : (
                        season.episodes.map((ep) => (
                          <TvShowEpisodeCard
                            key={ep.id}
                            ep={ep}
                            isLoggedIn={isLoggedIn}
                            isActionInProgress={isActionInProgress !== null}
                            isHighlighted={ep.episode_number === Number(highlightEpisode)}
                            handleEpisodeWatchToggle={handleEpisodeWatchToggle}
                            handleEpisodeVote={handleEpisodeVote}
                            handleEpisodeRating={handleEpisodeRating}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isOpen && data && details && (
        <TrailerPlayer
          movieId={details.id}
          movieTitle={details.name}
          isOpen={showTrailer}
          onClose={() => setShowTrailer(false)}
          mediaType="tv"
        />
      )}

      <ActorModal
        personId={selectedActorId}
        isOpen={!!selectedActorId}
        onClose={() => setSelectedActorId(null)}
        onSelectTvShow={(newShowId) => {
          setActiveShowId(newShowId);
          setSelectedActorId(null);
        }}
      />
    </>,
    document.body
  );
}
