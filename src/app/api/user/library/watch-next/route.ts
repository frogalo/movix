import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { updateWatchNextForUser, triggerDailySyncIfNeeded, sortWatchNextEpisodes } from '@/lib/watchNext';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    // Check if the table is empty for the user
    const dbCount = await prisma.watchNextEpisode.count({
      where: { userId }
    });

    let episodes: any[] = [];
    if (dbCount === 0) {
      // Check if user has followed TV Shows
      const showCount = await prisma.tvShow.count({
        where: { userId }
      });
      if (showCount > 0) {
        episodes = await updateWatchNextForUser(userId);
      }
    } else {
      const dbEpisodes = await prisma.watchNextEpisode.findMany({
        where: { userId }
      });
      // Sort in JS before returning, as calendar dates shift relative to 'today' (current date)
      episodes = sortWatchNextEpisodes(dbEpisodes, new Date());
    }

    // Trigger daily sync if needed (runs asynchronously in the background)
    triggerDailySyncIfNeeded();

    return NextResponse.json({
      watchNextEpisodes: episodes.map(ep => ({
        showId: ep.showId,
        showTitle: ep.showTitle,
        tmdbId: ep.tmdbId,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        overview: ep.overview,
        still_path: ep.stillPath || ep.still_path,
        air_date: ep.airDate || ep.air_date,
        remainingCount: ep.remainingCount,
        lastWatchedTime: new Date(ep.lastWatchedTime).getTime(),
        isNew: ep.isNew,
        isFuture: ep.isFuture,
        daysUntil: ep.daysUntil,
        totalEpisodesWatched: ep.totalEpisodesWatched,
        totalWatchTimeMinutes: ep.totalWatchTimeMinutes,
        isLastEpisodeOfLastSeason: ep.isLastEpisodeOfLastSeason,
      }))
    });
  } catch (error) {
    console.error('[LIBRARY_WATCH_NEXT_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
