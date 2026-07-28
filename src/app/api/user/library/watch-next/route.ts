import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fetchWithCache } from '@/lib/tmdbCache';

// Define a global cache structure on globalThis to persist across hot reloads and Next.js processes
type WatchNextCacheEntry = {
  episodes: any[];
  updatedAt: number;
  isRefreshing: boolean;
};

const globalForWatchNext = globalThis as unknown as {
  watchNextCache?: Map<string, WatchNextCacheEntry>;
};

const watchNextCache = globalForWatchNext.watchNextCache || new Map<string, WatchNextCacheEntry>();
if (process.env.NODE_ENV !== "production") {
  globalForWatchNext.watchNextCache = watchNextCache;
} else {
  globalForWatchNext.watchNextCache = watchNextCache;
}

async function getTvShowDetails(tmdbId: number, apiKey: string) {
  return fetchWithCache(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`, 3600);
}

async function getTvSeasonDetails(tmdbId: number, seasonNum: number, apiKey: string) {
  return fetchWithCache(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${apiKey}`, 3600);
}

async function resolveShowMetadata(show: any, apiKey: string) {
  let tmdbId = show.tmdbId;
  let posterPath = show.posterPath;
  let backdropPath = show.backdropPath;

  if (!tmdbId) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/find/${show.tvdbId}?external_source=tvdb_id&api_key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const result = data.tv_results?.[0];
        if (result) {
          tmdbId = result.id;
          posterPath = result.poster_path;
          backdropPath = result.backdrop_path;

          const updated = await prisma.tvShow.update({
            where: { id: show.id },
            data: {
              tmdbId,
              posterPath,
              backdropPath,
            },
            include: {
              episodes: true
            }
          });
          show = updated;
        }
      }
    } catch (err) {
      console.error(`Failed to resolve metadata for show tvdb:${show.tvdbId}`, err);
    }
  }

  let totalEpisodes = 0;
  let tmdbDetails: any = null;
  if (tmdbId) {
    try {
      const details = await getTvShowDetails(tmdbId, apiKey);
      if (details) {
        totalEpisodes = details.number_of_episodes || 0;
        tmdbDetails = details;
      }
    } catch (err) {
      console.error(`Failed to fetch TMDB details for tmdb:${tmdbId}`, err);
    }
  }

  return {
    ...show,
    tmdbId,
    posterPath,
    backdropPath,
    totalEpisodes,
    tmdbDetails,
  };
}

// Fetch and calculate all watch-next episodes with concurrency batching
async function fetchFreshWatchNext(userId: string, apiKey: string) {
  // Fetch ALL active shows (not completed or dropped) so new seasons / episodes appear automatically
  const activeShows = await prisma.tvShow.findMany({
    where: {
      userId,
      status: {
        notIn: ["completed", "dropped"],
      },
    },
    include: {
      episodes: true,
    },
  });

  const resolvedActiveShows: any[] = [];
  const batchSize = 15; // Limit parallel fetches to 15 at a time to prevent ETIMEDOUT errors
  for (let i = 0; i < activeShows.length; i += batchSize) {
    const batch = activeShows.slice(i, i + batchSize);
    const resolvedBatch = await Promise.all(
      batch.map(show => resolveShowMetadata(show, apiKey))
    );
    resolvedActiveShows.push(...resolvedBatch);
  }

  const watchNextEpisodes = (
    await Promise.all(
      resolvedActiveShows.map(async (show) => {
        if (!show.tmdbId) return null;
        
        // Reuse the resolved show details to avoid double-fetching TMDB
        const details = show.tmdbDetails;
        if (!details) return null;

        // Find latest watched episode (highest season, then highest episode number)
        const watched = show.episodes.filter((e: any) => e.isWatched);
        
        let nextSeason = 1;
        let nextEpisode = 1;

        if (watched.length > 0) {
          watched.sort((a: any, b: any) => {
            if (a.seasonNumber !== b.seasonNumber) return b.seasonNumber - a.seasonNumber;
            return b.episodeNumber - a.episodeNumber;
          });
          const latest = watched[0];

          nextSeason = latest.seasonNumber;
          nextEpisode = latest.episodeNumber + 1;

          const currentSeasonMeta = details.seasons?.find((s: any) => s.season_number === latest.seasonNumber);
          if (currentSeasonMeta) {
            if (nextEpisode > currentSeasonMeta.episode_count) {
              const nextSeasonMeta = details.seasons?.find((s: any) => s.season_number === latest.seasonNumber + 1);
              if (nextSeasonMeta) {
                nextSeason = latest.seasonNumber + 1;
                nextEpisode = 1;
              } else {
                // Fully caught up
                return null;
              }
            }
          } else {
            return null;
          }
        } else {
          // Find the first regular season (season_number > 0)
          const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
          if (regularSeasons.length > 0) {
            const sortedSeasons = [...regularSeasons].sort((a: any, b: any) => a.season_number - b.season_number);
            nextSeason = sortedSeasons[0].season_number;
            nextEpisode = 1;
          } else {
            return null;
          }
        }

        // Fetch details of the next season to get the episode overview and still image
        const seasonDetails = await getTvSeasonDetails(show.tmdbId, nextSeason, apiKey);
        const epMeta = seasonDetails?.episodes?.find((e: any) => e.episode_number === nextEpisode);
        if (!epMeta) return null; // No episode details available

        // Determine if it's a future episode
        const airDateStr = epMeta.air_date || null;
        let isFuture = false;
        let daysUntil = 0;
        if (airDateStr) {
          const airDate = new Date(airDateStr);
          if (airDate.getTime() > Date.now()) {
            isFuture = true;
            daysUntil = Math.ceil((airDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          }
        }
        
        if (isFuture && daysUntil > 2) {
          return null; // Next episode is too far away
        }

        // Calculate remaining unwatched episodes count (excluding future/unaired ones)
        const watchedCount = show.episodes.filter((e: any) => e.isWatched).length;
        const now = new Date();
        const pastEpisodesCount = details.seasons
          ?.filter((s: any) => s.season_number > 0 && s.season_number < nextSeason)
          ?.reduce((sum: number, s: any) => sum + s.episode_count, 0) || 0;
          
        const airedEpisodesInCurrentSeason = seasonDetails?.episodes
          ?.filter((ep: any) => {
            if (!ep.air_date) return false;
            const airDate = new Date(ep.air_date);
            return airDate.getTime() <= now.getTime();
          })?.length || 0;

        const subsequentEpisodesCount = details.seasons
          ?.filter((s: any) => s.season_number > nextSeason)
          ?.reduce((sum: number, s: any) => {
            if (!s.air_date) return sum;
            const seasonAirDate = new Date(s.air_date);
            if (seasonAirDate.getTime() > now.getTime()) return sum;
            return sum + s.episode_count;
          }, 0) || 0;
          
        const totalAiredEpisodes = pastEpisodesCount + airedEpisodesInCurrentSeason + subsequentEpisodesCount;
        const remainingCount = isFuture ? 0 : Math.max(0, totalAiredEpisodes - watchedCount - 1);
        const episodeRunTime = details.episode_run_time?.[0] || 45;
        const totalWatchTimeMinutes = watchedCount * episodeRunTime;

        // Find last watched date for the show, or fall back to show's updatedAt if no episodes watched
        const watchedDates = show.episodes
          .filter((e: any) => e.isWatched && e.watchedAt)
          .map((e: any) => new Date(e.watchedAt!).getTime());
        const lastWatchedTime = watchedDates.length > 0 ? Math.max(...watchedDates) : new Date(show.updatedAt).getTime();

        // Check if the next episode is NEW (released in last 14 days or upcoming)
        const airDate = airDateStr ? new Date(airDateStr) : null;
        let isNew = false;
        if (airDate) {
           isNew = (Date.now() - airDate.getTime()) < (14 * 24 * 60 * 60 * 1000) || airDate.getTime() > Date.now();
        }

        // Determine if this is the final episode of the final season
        const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
        let lastSeasonNum = 0;
        let lastEpisodeNum = 0;
        if (regularSeasons.length > 0) {
          const sortedSeasons = [...regularSeasons].sort((a: any, b: any) => b.season_number - a.season_number);
          const lastSeasonMeta = sortedSeasons[0];
          lastSeasonNum = lastSeasonMeta.season_number;
          lastEpisodeNum = lastSeasonMeta.episode_count;
        }
        const isLastEpisodeOfLastSeason = (nextSeason === lastSeasonNum) && (nextEpisode === lastEpisodeNum);

        return {
          showId: show.id,
          showTitle: show.title,
          tmdbId: show.tmdbId,
          seasonNumber: nextSeason,
          episodeNumber: nextEpisode,
          name: epMeta.name || `Episode ${nextEpisode}`,
          overview: epMeta.overview || "No overview available.",
          still_path: epMeta.still_path || show.backdropPath || show.posterPath,
          air_date: airDateStr,
          remainingCount,
          lastWatchedTime,
          isNew: !!isNew,
          isFuture,
          daysUntil,
          totalEpisodesWatched: watchedCount,
          totalWatchTimeMinutes,
          isLastEpisodeOfLastSeason,
        };
      })
    )
  ).filter(Boolean);

  // Sort Watch Next: NEW first, then sort by lastWatchedTime descending
  const sortedWatchNextEpisodes = (watchNextEpisodes as any[]).sort((a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return b.lastWatchedTime - a.lastWatchedTime;
  });

  return sortedWatchNextEpisodes;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const apiKey = process.env.TMDB_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB API Key missing' }, { status: 500 });
    }

    const cached = watchNextCache.get(userId);
    const now = Date.now();
    const CACHE_TTL = 30 * 60 * 1000; // Cache for 30 minutes

    if (cached) {
      // If the cache is older than CACHE_TTL, trigger a background refresh but return cached data immediately (instant load)
      if (now - cached.updatedAt > CACHE_TTL && !cached.isRefreshing) {
        cached.isRefreshing = true;
        fetchFreshWatchNext(userId, apiKey)
          .then((freshEpisodes) => {
            watchNextCache.set(userId, {
              episodes: freshEpisodes,
              updatedAt: Date.now(),
              isRefreshing: false,
            });
          })
          .catch((err) => {
            console.error('[WATCH_NEXT_BACKGROUND_REFRESH]', err);
            cached.isRefreshing = false;
          });
      }

      return NextResponse.json({
        watchNextEpisodes: cached.episodes,
      });
    }

    // Uncached: first load awaits the fetch to build the initial cache
    const freshEpisodes = await fetchFreshWatchNext(userId, apiKey);
    watchNextCache.set(userId, {
      episodes: freshEpisodes,
      updatedAt: Date.now(),
      isRefreshing: false,
    });

    return NextResponse.json({
      watchNextEpisodes: freshEpisodes,
    });
  } catch (error) {
    console.error('[LIBRARY_WATCH_NEXT_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
