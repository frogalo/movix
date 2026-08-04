import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { updateWatchNextForShow } from '@/lib/watchNext';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const {
      tvdbId,      // Show TVDB ID
      tmdbId,      // Show TMDB ID
      showTitle,   // Show title (for auto-creating the show)
      seasonNumber,
      episodeNumber,
      episodeTvdbId, // Episode TVDB ID (optional)
      isWatched,   // Boolean
      rating,      // Number (1-10 or null)
      vote,        // String (reaction or null)
      bulk,        // undefined, "season", or "series"
      episodeCount, // number (optional)
      seasonsData, // array of { seasonNumber, episodeCount } (optional)
    } = await req.json();

    if ((!tvdbId && !tmdbId) || (bulk === undefined && (seasonNumber === undefined || episodeNumber === undefined))) {
      return new NextResponse('Missing required fields: show identifier, season number, episode number', { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY;

    // 1. Find or create the TvShow in the database
    let show = await prisma.tvShow.findFirst({
      where: {
        userId,
        OR: [
          ...(tmdbId ? [{ tmdbId: Number(tmdbId) }] : []),
          ...(tvdbId ? [{ tvdbId: Number(tvdbId) }] : []),
        ],
      },
    });

    if (!show) {
      console.log(`[EPISODE_POST] Show not found in DB. Auto-creating show: ${showTitle}`);
      let finalTvdbId = tvdbId ? Number(tvdbId) : null;
      let finalTmdbId = tmdbId ? Number(tmdbId) : null;

      // Resolve TVDB ID from TMDB if missing
      if (!finalTvdbId && finalTmdbId && apiKey) {
        try {
          const extRes = await fetch(
            `https://api.themoviedb.org/3/tv/${finalTmdbId}/external_ids?api_key=${apiKey}`
          );
          if (extRes.ok) {
            const extData = await extRes.json();
            finalTvdbId = extData.tvdb_id ? Number(extData.tvdb_id) : null;
          }
        } catch (e) {
          console.error('[EPISODE_POST] Failed to fetch external IDs from TMDB', e);
        }
      }

      // Resolve TMDB ID from TVDB if missing
      if (!finalTmdbId && finalTvdbId && apiKey) {
        try {
          const findRes = await fetch(
            `https://api.themoviedb.org/3/find/${finalTvdbId}?external_source=tvdb_id&api_key=${apiKey}`
          );
          if (findRes.ok) {
            const findData = await findRes.json();
            const tvResult = findData.tv_results?.[0];
            if (tvResult) {
              finalTmdbId = tvResult.id;
            }
          }
        } catch (e) {
          console.error('[EPISODE_POST] Failed to resolve TMDB ID from TVDB ID', e);
        }
      }

      // If still missing IDs, fall back
      const resolvedTvdb = finalTvdbId || finalTmdbId || Math.floor(Math.random() * 1000000);

      show = await prisma.tvShow.create({
        data: {
          userId,
          tvdbId: resolvedTvdb,
          tmdbId: finalTmdbId,
          title: showTitle || 'Unknown Show',
          status: 'watching',
        },
      });
    }

    if (bulk === "season") {
      if (seasonNumber === undefined || !episodeCount) {
        return new NextResponse('Missing seasonNumber or episodeCount for bulk season operation', { status: 400 });
      }

      const upsertPromises = [];
      for (let epNum = 1; epNum <= Number(episodeCount); epNum++) {
        const dummyEpisodeTvdbId = (show.tvdbId % 100000) * 10000 + Number(seasonNumber) * 100 + epNum;
        upsertPromises.push(
          prisma.tvEpisode.upsert({
            where: {
              showId_seasonNumber_episodeNumber: {
                showId: show.id,
                seasonNumber: Number(seasonNumber),
                episodeNumber: epNum,
              },
            },
            update: {
              isWatched: Boolean(isWatched),
              ...(isWatched === true && { watchedAt: new Date() }),
              ...(isWatched === false && { watchedAt: null }),
            },
            create: {
              showId: show.id,
              tvdbId: dummyEpisodeTvdbId,
              seasonNumber: Number(seasonNumber),
              episodeNumber: epNum,
              isWatched: Boolean(isWatched),
              watchedAt: isWatched === false ? null : new Date(),
            },
          })
        );
      }

      await Promise.all(upsertPromises);

      await prisma.tvShow.update({
        where: { id: show.id },
        data: { updatedAt: new Date() },
      });

      // Update Watch Next episodes list in the background
      updateWatchNextForShow(userId, show.id).catch((err) => {
        console.error('[EPISODE_POST_SEASON_WATCH_NEXT_UPDATE_ERROR]', err);
      });

      return NextResponse.json({ success: true, count: episodeCount });
    }

    if (bulk === "series") {
      if (!seasonsData || !Array.isArray(seasonsData)) {
        return new NextResponse('Missing seasonsData array for bulk series operation', { status: 400 });
      }

      const upsertPromises = [];
      let totalCount = 0;
      for (const s of seasonsData) {
        const sNum = Number(s.seasonNumber);
        const epCount = Number(s.episodeCount);
        totalCount += epCount;
        
        for (let epNum = 1; epNum <= epCount; epNum++) {
          const dummyEpisodeTvdbId = (show.tvdbId % 100000) * 10000 + sNum * 100 + epNum;
          upsertPromises.push(
            prisma.tvEpisode.upsert({
              where: {
                showId_seasonNumber_episodeNumber: {
                  showId: show.id,
                  seasonNumber: sNum,
                  episodeNumber: epNum,
                },
              },
              update: {
                isWatched: Boolean(isWatched),
                ...(isWatched === true && { watchedAt: new Date() }),
                ...(isWatched === false && { watchedAt: null }),
              },
              create: {
                showId: show.id,
                tvdbId: dummyEpisodeTvdbId,
                seasonNumber: sNum,
                episodeNumber: epNum,
                isWatched: Boolean(isWatched),
                watchedAt: isWatched === false ? null : new Date(),
              },
            })
          );
        }
      }

      await Promise.all(upsertPromises);

      await prisma.tvShow.update({
        where: { id: show.id },
        data: { updatedAt: new Date() },
      });

      // Update Watch Next episodes list in the background
      updateWatchNextForShow(userId, show.id).catch((err) => {
        console.error('[EPISODE_POST_SERIES_WATCH_NEXT_UPDATE_ERROR]', err);
      });

      return NextResponse.json({ success: true, count: totalCount });
    }

    // 2. Determine episode TVDB ID
    let finalEpisodeTvdbId = episodeTvdbId ? Number(episodeTvdbId) : null;
    if (!finalEpisodeTvdbId) {
      // Create a predictable dummy ID if not provided, or default to a random one
      finalEpisodeTvdbId = Math.floor(Math.random() * 10000000);
    }

    // 3. Upsert Episode Progress
    const ep = await prisma.tvEpisode.upsert({
      where: {
        showId_seasonNumber_episodeNumber: {
          showId: show.id,
          seasonNumber: Number(seasonNumber),
          episodeNumber: Number(episodeNumber),
        },
      },
      update: {
        ...(isWatched !== undefined && { isWatched: Boolean(isWatched) }),
        ...(isWatched === true && { watchedAt: new Date() }),
        ...(isWatched === false && { watchedAt: null }),
        ...(rating !== undefined && { rating: rating === null ? null : Number(rating) }),
        ...(vote !== undefined && { vote: vote === null ? null : String(vote) }),
      },
      create: {
        showId: show.id,
        tvdbId: finalEpisodeTvdbId,
        seasonNumber: Number(seasonNumber),
        episodeNumber: Number(episodeNumber),
        isWatched: isWatched === undefined ? true : Boolean(isWatched),
        watchedAt: isWatched === false ? null : new Date(),
        rating: rating ? Number(rating) : null,
        vote: vote || null,
      },
    });

    // 4. Update the show's updatedAt timestamp
    await prisma.tvShow.update({
      where: { id: show.id },
      data: { updatedAt: new Date() },
    });

    // Invalidate Watch Next cache for this user
    const globalForWatchNext = globalThis as unknown as {
      watchNextCache?: Map<string, any>;
    };
    if (globalForWatchNext.watchNextCache) {
      globalForWatchNext.watchNextCache.delete(userId);
    }

    // Update Watch Next episodes list in the background
    updateWatchNextForShow(userId, show.id).catch((err) => {
      console.error('[EPISODE_POST_WATCH_NEXT_UPDATE_ERROR]', err);
    });

    return NextResponse.json(ep);
  } catch (error) {
    console.error('[EPISODES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
