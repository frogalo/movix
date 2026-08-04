import { prisma } from '@/lib/prisma';
import { fetchWithCache } from '@/lib/tmdbCache';

// Helper to get TMDB details
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

export function sortWatchNextEpisodes(episodes: any[], currentDate: Date) {
  const getDiffDays = (airDateStr: string | null) => {
    if (!airDateStr) return null;
    const parts = airDateStr.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const todayLocal = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const releaseDate = new Date(year, month, day);

    const diffTime = releaseDate.getTime() - todayLocal.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getGroup = (ep: any) => {
    const diff = getDiffDays(ep.airDate || ep.air_date);
    if (diff !== null) {
      if (diff === -1 || diff === -2) {
        return 1; // Recent premieres (1-2 days ago)
      }
      if (diff === 1 || diff === 2) {
        return 2; // Upcoming (1-2 days future)
      }
    }
    return 3; // New episodes
  };

  return [...episodes].sort((a, b) => {
    const groupA = getGroup(a);
    const groupB = getGroup(b);

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    // Secondary sorting:
    if (groupA === 1) {
      // Recent premieres: sort by airDate descending (newer premiere first)
      const dateA = new Date(a.airDate || a.air_date || 0).getTime();
      const dateB = new Date(b.airDate || b.air_date || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
    } else if (groupA === 2) {
      // Upcoming: sort by airDate ascending (closest first)
      const dateA = new Date(a.airDate || a.air_date || 0).getTime();
      const dateB = new Date(b.airDate || b.air_date || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
    }

    // Fallback/Group 3: sort by lastWatchedTime descending
    const timeA = new Date(a.lastWatchedTime).getTime();
    const timeB = new Date(b.lastWatchedTime).getTime();
    return timeB - timeA;
  });
}

export async function updateWatchNextForUser(userId: string) {
  const apiKey = process.env.TMDB_API_KEY || '';
  if (!apiKey) {
    console.error('TMDB API Key missing in updateWatchNextForUser');
    return [];
  }

  // 1. Fetch ALL active shows (not completed or dropped)
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
  const batchSize = 15;
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
          stillPath: epMeta.still_path || show.backdropPath || show.posterPath,
          airDate: airDateStr,
          remainingCount,
          lastWatchedTime: new Date(lastWatchedTime),
          isNew: !!isNew,
          isFuture,
          daysUntil,
          totalEpisodesWatched: watchedCount,
          totalWatchTimeMinutes,
          isLastEpisodeOfLastSeason,
        };
      })
    )
  ).filter(Boolean) as any[];

  // 2. Sort episodes using the required order
  const currentDate = new Date();
  const sortedEpisodes = sortWatchNextEpisodes(watchNextEpisodes, currentDate);

  // 3. Keep top 20
  const top20Episodes = sortedEpisodes.slice(0, 20);

  // 4. Update the database table in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.watchNextEpisode.deleteMany({
      where: { userId }
    });

    if (top20Episodes.length > 0) {
      await tx.watchNextEpisode.createMany({
        data: top20Episodes.map((ep) => ({
          userId,
          showId: ep.showId,
          showTitle: ep.showTitle,
          tmdbId: ep.tmdbId,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          overview: ep.overview,
          stillPath: ep.stillPath,
          airDate: ep.airDate,
          remainingCount: ep.remainingCount,
          lastWatchedTime: ep.lastWatchedTime,
          isNew: ep.isNew,
          isFuture: ep.isFuture,
          daysUntil: ep.daysUntil,
          totalEpisodesWatched: ep.totalEpisodesWatched,
          totalWatchTimeMinutes: ep.totalWatchTimeMinutes,
          isLastEpisodeOfLastSeason: ep.isLastEpisodeOfLastSeason,
        }))
      });
    }
  });

  return top20Episodes;
}

export async function dailySyncWatchNext() {
  const usersWithShows = await prisma.user.findMany({
    where: {
      tvShows: {
        some: {}
      }
    },
    select: {
      id: true
    }
  });

  console.log(`[DAILY_SYNC] Starting sync for ${usersWithShows.length} users...`);
  for (const user of usersWithShows) {
    try {
      await updateWatchNextForUser(user.id);
    } catch (err) {
      console.error(`[DAILY_SYNC] Failed for user ${user.id}:`, err);
    }
  }
  console.log(`[DAILY_SYNC] Sync complete.`);
}

export async function triggerDailySyncIfNeeded() {
  try {
    const key = "last_global_sync_time";
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    });

    const now = new Date();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (!setting || (now.getTime() - new Date(setting.value).getTime()) > ONE_DAY_MS) {
      console.log(`[DAILY_SYNC_TRIGGER] Triggering daily watch-next sync...`);
      // Update setting immediately to prevent concurrent triggers
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: now.toISOString() },
        create: { key, value: now.toISOString() }
      });

      dailySyncWatchNext().catch(err => {
        console.error('[DAILY_SYNC_BACKGROUND_ERROR]', err);
      });
    }
  } catch (err) {
    console.error('[TRIGGER_DAILY_SYNC_FAILED]', err);
  }
}

export async function updateWatchNextForShow(userId: string, showId: string) {
  const apiKey = process.env.TMDB_API_KEY || '';
  if (!apiKey) {
    console.error('TMDB API Key missing in updateWatchNextForShow');
    return;
  }

  try {
    const show = await prisma.tvShow.findFirst({
      where: { id: showId, userId },
      include: { episodes: true }
    });

    if (!show || show.status === "completed" || show.status === "dropped") {
      // If the show is completed, dropped, or untracked, delete it from the watch next table
      await prisma.watchNextEpisode.deleteMany({
        where: { userId, showId }
      });
      return;
    }

    const resolved = await resolveShowMetadata(show, apiKey);
    if (!resolved.tmdbId || !resolved.tmdbDetails) {
      await prisma.watchNextEpisode.deleteMany({
        where: { userId, showId }
      });
      return;
    }

    const details = resolved.tmdbDetails;
    const watched = resolved.episodes.filter((e: any) => e.isWatched);

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
            await prisma.watchNextEpisode.deleteMany({ where: { userId, showId } });
            return;
          }
        }
      } else {
        await prisma.watchNextEpisode.deleteMany({ where: { userId, showId } });
        return;
      }
    } else {
      const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
      if (regularSeasons.length > 0) {
        const sortedSeasons = [...regularSeasons].sort((a: any, b: any) => a.season_number - b.season_number);
        nextSeason = sortedSeasons[0].season_number;
        nextEpisode = 1;
      } else {
        await prisma.watchNextEpisode.deleteMany({ where: { userId, showId } });
        return;
      }
    }

    const seasonDetails = await getTvSeasonDetails(resolved.tmdbId, nextSeason, apiKey);
    const epMeta = seasonDetails?.episodes?.find((e: any) => e.episode_number === nextEpisode);
    if (!epMeta) {
      await prisma.watchNextEpisode.deleteMany({ where: { userId, showId } });
      return;
    }

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
      await prisma.watchNextEpisode.deleteMany({ where: { userId, showId } });
      return;
    }

    const watchedCount = resolved.episodes.filter((e: any) => e.isWatched).length;
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

    const watchedDates = resolved.episodes
      .filter((e: any) => e.isWatched && e.watchedAt)
      .map((e: any) => new Date(e.watchedAt!).getTime());
    const lastWatchedTime = watchedDates.length > 0 ? Math.max(...watchedDates) : new Date(resolved.updatedAt).getTime();

    const airDate = airDateStr ? new Date(airDateStr) : null;
    let isNew = false;
    if (airDate) {
       isNew = (Date.now() - airDate.getTime()) < (14 * 24 * 60 * 60 * 1000) || airDate.getTime() > Date.now();
    }

    const regularSeasonsList = details.seasons?.filter((s: any) => s.season_number > 0) || [];
    let lastSeasonNum = 0;
    let lastEpisodeNum = 0;
    if (regularSeasonsList.length > 0) {
      const sortedSeasons = [...regularSeasonsList].sort((a: any, b: any) => b.season_number - a.season_number);
      const lastSeasonMeta = sortedSeasons[0];
      lastSeasonNum = lastSeasonMeta.season_number;
      lastEpisodeNum = lastSeasonMeta.episode_count;
    }
    const isLastEpisodeOfLastSeason = (nextSeason === lastSeasonNum) && (nextEpisode === lastEpisodeNum);

    await prisma.watchNextEpisode.upsert({
      where: {
        userId_showId: { userId, showId }
      },
      update: {
        showTitle: resolved.title,
        tmdbId: resolved.tmdbId,
        seasonNumber: nextSeason,
        episodeNumber: nextEpisode,
        name: epMeta.name || `Episode ${nextEpisode}`,
        overview: epMeta.overview || "No overview available.",
        stillPath: epMeta.still_path || resolved.backdropPath || resolved.posterPath,
        airDate: airDateStr,
        remainingCount,
        lastWatchedTime: new Date(lastWatchedTime),
        isNew: !!isNew,
        isFuture,
        daysUntil,
        totalEpisodesWatched: watchedCount,
        totalWatchTimeMinutes,
        isLastEpisodeOfLastSeason,
      },
      create: {
        userId,
        showId,
        showTitle: resolved.title,
        tmdbId: resolved.tmdbId,
        seasonNumber: nextSeason,
        episodeNumber: nextEpisode,
        name: epMeta.name || `Episode ${nextEpisode}`,
        overview: epMeta.overview || "No overview available.",
        stillPath: epMeta.still_path || resolved.backdropPath || resolved.posterPath,
        airDate: airDateStr,
        remainingCount,
        lastWatchedTime: new Date(lastWatchedTime),
        isNew: !!isNew,
        isFuture,
        daysUntil,
        totalEpisodesWatched: watchedCount,
        totalWatchTimeMinutes,
        isLastEpisodeOfLastSeason,
      }
    });

    // Enforce 20-episode limit
    const allUserEpisodes = await prisma.watchNextEpisode.findMany({
      where: { userId }
    });
    if (allUserEpisodes.length > 20) {
      const sortedAll = sortWatchNextEpisodes(allUserEpisodes, new Date());
      const excess = sortedAll.slice(20);
      const excessIds = excess.map(ep => ep.id);
      await prisma.watchNextEpisode.deleteMany({
        where: {
          id: { in: excessIds }
        }
      });
    }
  } catch (err) {
    console.error(`[updateWatchNextForShow] Failed for user ${userId}, show ${showId}:`, err);
  }
}
