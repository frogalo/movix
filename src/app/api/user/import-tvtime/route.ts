import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const importData = await request.json();

    let shows: any[] = [];
    let watchlists: any[] = [];
    let ratings: any[] = [];

    if (Array.isArray(importData)) {
      // Standard TV Time format
      shows = importData;
    } else if (importData && typeof importData === 'object') {
      // Movix export format
      watchlists = importData.watchlists || [];
      ratings = importData.ratings || [];
      const rawShows = importData.tvShows || [];

      shows = rawShows.map((s: any) => {
        const seasonsMap: { [key: number]: any[] } = {};
        if (s.episodes && Array.isArray(s.episodes)) {
          for (const ep of s.episodes) {
            const sn = ep.seasonNumber;
            if (!seasonsMap[sn]) seasonsMap[sn] = [];
            seasonsMap[sn].push({
              id: { tvdb: ep.tvdbId },
              number: ep.episodeNumber,
              name: ep.name,
              is_watched: ep.isWatched,
              watched_at: ep.watchedAt,
              rewatch_count: ep.rewatchCount,
            });
          }
        }

        const seasons = Object.entries(seasonsMap).map(([num, eps]) => ({
          number: Number(num),
          episodes: eps
        }));

        return {
          id: {
            tvdb: s.tvdbId,
            imdb: s.imdbId
          },
          title: s.title,
          status: s.status,
          is_favorite: s.isFavorite,
          seasons
        };
      });
    } else {
      return new NextResponse('Invalid import file structure', { status: 400 });
    }

    console.log(`[IMPORT] Starting database transaction for ${shows.length} shows...`);

    // Import Watchlists if present
    if (watchlists.length > 0) {
      await prisma.watchlist.deleteMany({ where: { userId } });
      await prisma.watchlist.createMany({
        data: watchlists.map((w: any) => ({
          userId,
          movieId: Number(w.movieId),
          createdAt: w.createdAt ? new Date(w.createdAt) : new Date()
        }))
      });
    }

    // Import Ratings if present
    if (ratings.length > 0) {
      await prisma.rating.deleteMany({ where: { userId } });
      await prisma.rating.createMany({
        data: ratings.map((r: any) => ({
          userId,
          movieId: Number(r.movieId),
          rating: Number(r.rating),
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
        }))
      });
    }

    let importedShowsCount = 0;
    let importedEpisodesCount = 0;

    for (const show of shows) {
      if (!show.id || !show.id.tvdb) {
        continue;
      }

      const tvdbId = Number(show.id.tvdb);

      const tvShow = await prisma.tvShow.upsert({
        where: {
          userId_tvdbId: {
            userId,
            tvdbId,
          },
        },
        update: {
          title: show.title || 'Unknown Show',
          status: show.status || 'watching',
          isFavorite: show.is_favorite || false,
          imdbId: show.id.imdb || null,
        },
        create: {
          userId,
          tvdbId,
          title: show.title || 'Unknown Show',
          status: show.status || 'watching',
          isFavorite: show.is_favorite || false,
          imdbId: show.id.imdb || null,
        },
      });

      importedShowsCount++;

      const episodesToInsert: any[] = [];
      if (show.seasons && Array.isArray(show.seasons)) {
        for (const season of show.seasons) {
          const seasonNumber = Number(season.number);
          if (season.episodes && Array.isArray(season.episodes)) {
            for (const ep of season.episodes) {
              const isWatched = ep.is_watched || false;
              if (isWatched) {
                episodesToInsert.push({
                  showId: tvShow.id,
                  tvdbId: Number(ep.id.tvdb),
                  seasonNumber,
                  episodeNumber: Number(ep.number),
                  name: ep.name || null,
                  isWatched: true,
                  watchedAt: ep.watched_at ? new Date(ep.watched_at) : null,
                  rewatchCount: ep.rewatch_count || 0,
                });
              }
            }
          }
        }
      }

      if (episodesToInsert.length > 0) {
        await prisma.tvEpisode.deleteMany({
          where: {
            showId: tvShow.id,
          },
        });

        await prisma.tvEpisode.createMany({
          data: episodesToInsert,
        });

        importedEpisodesCount += episodesToInsert.length;
      }
    }

    return NextResponse.json({
      success: true,
      showsCount: importedShowsCount,
      episodesCount: importedEpisodesCount,
    });
  } catch (error: any) {
    console.error('[IMPORT_TVTIME_POST]', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
