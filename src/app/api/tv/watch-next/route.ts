import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fetchWithCache } from '@/lib/tmdbCache';

async function getTvShowDetails(tmdbId: number, apiKey: string) {
  return fetchWithCache(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`, 3600);
}

async function getTvSeasonDetails(tmdbId: number, seasonNum: number, apiKey: string) {
  return fetchWithCache(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${apiKey}`, 3600);
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const showId = searchParams.get('showId');
    if (!showId) {
      return new NextResponse('Missing showId', { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return new NextResponse('Missing API Key', { status: 500 });

    const show = await prisma.tvShow.findUnique({
      where: { id: showId, userId: session.user.id },
      include: { episodes: true },
    });

    if (!show || !show.tmdbId) {
      return NextResponse.json(null);
    }

    const details = await getTvShowDetails(show.tmdbId, apiKey);
    if (!details) return NextResponse.json(null);

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
            return NextResponse.json(null);
          }
        }
      } else {
        return NextResponse.json(null);
      }
    } else {
      // Find the first regular season (season_number > 0)
      const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
      if (regularSeasons.length > 0) {
        const sortedSeasons = [...regularSeasons].sort((a: any, b: any) => a.season_number - b.season_number);
        nextSeason = sortedSeasons[0].season_number;
        nextEpisode = 1;
      } else {
        return NextResponse.json(null);
      }
    }

    const seasonDetails = await getTvSeasonDetails(show.tmdbId, nextSeason, apiKey);
    const epMeta = seasonDetails?.episodes?.find((e: any) => e.episode_number === nextEpisode);
    if (!epMeta) return NextResponse.json(null);

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
      return NextResponse.json(null);
    }

    const watchedCount = show.episodes.filter((e: any) => e.isWatched).length;

    // Count only aired episodes (excluding future ones)
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

    const watchedDates = show.episodes
      .filter((e: any) => e.isWatched && e.watchedAt)
      .map((e: any) => new Date(e.watchedAt!).getTime());
    const lastWatchedTime = watchedDates.length > 0 ? Math.max(...watchedDates) : new Date(show.updatedAt).getTime();

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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('[WATCH_NEXT_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
