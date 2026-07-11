import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const seasonNumberStr = searchParams.get('season') || 'auto';
    const requestedSeasonNumber = seasonNumberStr === 'auto' ? null : Number(seasonNumberStr);

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return new NextResponse('TMDB API Key missing', { status: 500 });
    }

    // 1. Try to find the show in the database
    let dbShow = await prisma.tvShow.findFirst({
      where: {
        userId,
        OR: [
          { id: id },
          ...(isNaN(Number(id)) ? [] : [
            { tmdbId: Number(id) },
            { tvdbId: Number(id) }
          ])
        ]
      },
      include: {
        episodes: true
      }
    });

    let tmdbId: number | null = null;
    let tvdbId: number | null = null;

    if (dbShow) {
      tvdbId = dbShow.tvdbId;
      if (dbShow.tmdbId) {
        tmdbId = dbShow.tmdbId;
      }
    } else if (!isNaN(Number(id))) {
      // If not in database but id is a number, assume it's TMDB ID
      tmdbId = Number(id);
    }

    // 2. If we only have TVDB ID, resolve TMDB ID using TMDB Find
    if (tvdbId && !tmdbId) {
      console.log(`[TV_DETAILS] Resolving TVDB ID ${tvdbId} via TMDB Find...`);
      const findRes = await fetch(
        `https://api.themoviedb.org/3/find/${tvdbId}?external_source=tvdb_id&api_key=${apiKey}`
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const tvResult = findData.tv_results?.[0];
        if (tvResult) {
          tmdbId = tvResult.id;
          console.log(`[TV_DETAILS] Resolved TVDB ID ${tvdbId} to TMDB ID ${tmdbId}`);
          
          // Update the database record with tmdbId to cache it
          if (dbShow) {
            dbShow = await prisma.tvShow.update({
              where: { id: dbShow.id },
              data: { tmdbId },
              include: { episodes: true }
            });
          }
        }
      }
    }

    // 3. Fetch TV Show details from TMDB
    if (!tmdbId) {
      // If still no TMDB ID, and id is a number, let's treat id as TMDB ID
      if (!isNaN(Number(id))) {
        tmdbId = Number(id);
      } else {
        return new NextResponse('Show not found', { status: 444 });
      }
    }

    const [detailsRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${apiKey}`)
    ]);

    // Helper to resolve auto season
    const resolveSeason = (detailsObj: any, showRecord: any) => {
      if (requestedSeasonNumber !== null) return requestedSeasonNumber;
      if (!showRecord || !showRecord.episodes || showRecord.episodes.length === 0) return 1;
      
      const watched = showRecord.episodes.filter((e: any) => e.isWatched);
      if (watched.length === 0) return 1;

      watched.sort((a: any, b: any) => {
        if (a.seasonNumber !== b.seasonNumber) return b.seasonNumber - a.seasonNumber;
        return b.episodeNumber - a.episodeNumber;
      });
      const latest = watched[0];
      
      const seasonMeta = detailsObj.seasons?.find((s: any) => s.season_number === latest.seasonNumber);
      if (seasonMeta && latest.episodeNumber < seasonMeta.episode_count) {
        return latest.seasonNumber;
      }
      
      const nextSeason = detailsObj.seasons?.find((s: any) => s.season_number === latest.seasonNumber + 1);
      return nextSeason ? latest.seasonNumber + 1 : latest.seasonNumber;
    };

    if (!detailsRes.ok) {
      if (!dbShow && !tvdbId) {
        const findRes = await fetch(
          `https://api.themoviedb.org/3/find/${id}?external_source=tvdb_id&api_key=${apiKey}`
        );
        if (findRes.ok) {
          const findData = await findRes.json();
          const tvResult = findData.tv_results?.[0];
          if (tvResult) {
            tmdbId = tvResult.id;
            const retryRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`);
            if (retryRes.ok) {
              const details = await retryRes.json();
              const creditsResRetry = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${apiKey}`);
              const credits = creditsResRetry.ok ? await creditsResRetry.json() : { cast: [] };
              return await buildResponse(dbShow, details, credits, resolveSeason(details, dbShow), tmdbId!, apiKey);
            }
          }
        }
      }
      return new NextResponse('TV Show details not found in TMDB', { status: 404 });
    }

    const details = await detailsRes.json();
    const credits = creditsRes.ok ? await creditsRes.json() : { cast: [] };

    // Update database with tmdbId, posterPath, backdropPath if missing
    if (dbShow && (!dbShow.tmdbId || !dbShow.posterPath || !dbShow.backdropPath)) {
      dbShow = await prisma.tvShow.update({
        where: { id: dbShow.id },
        data: {
          tmdbId: dbShow.tmdbId || tmdbId,
          posterPath: dbShow.posterPath || details.poster_path || null,
          backdropPath: dbShow.backdropPath || details.backdrop_path || null,
        },
        include: { episodes: true }
      });
    }

    return await buildResponse(dbShow, details, credits, resolveSeason(details, dbShow), tmdbId!, apiKey);

  } catch (error) {
    console.error('[TV_DETAILS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

async function buildResponse(
  dbShow: any,
  details: any,
  credits: any,
  seasonNumber: number,
  tmdbId: number,
  apiKey: string
) {
  // Extract cast
  const cast = credits.cast?.slice(0, 5).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profile_path: c.profile_path
  })) || [];

  // Fetch season episodes
  let episodes: any[] = [];
  const seasonRes = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${apiKey}`
  );

  if (seasonRes.ok) {
    const seasonData = await seasonRes.json();
    if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
      episodes = seasonData.episodes.map((ep: any) => {
        // Map database state if exists
        const dbEpisode = dbShow?.episodes?.find(
          (e: any) => e.seasonNumber === seasonNumber && e.episodeNumber === ep.episode_number
        );

        return {
          id: ep.id,
          name: ep.name,
          episode_number: ep.episode_number,
          overview: ep.overview,
          still_path: ep.still_path,
          air_date: ep.air_date,
          // user data
          isWatched: dbEpisode?.isWatched || false,
          watchedAt: dbEpisode?.watchedAt || null,
          rating: dbEpisode?.rating || null,
          vote: dbEpisode?.vote || null,
          dbEpisodeId: dbEpisode?.id || null,
        };
      });
    }
  }

  // Calculate overall stats for the show
  const totalEpisodesTracked = dbShow?.episodes?.length || 0;

  return NextResponse.json({
    dbShow: dbShow ? {
      id: dbShow.id,
      tvdbId: dbShow.tvdbId,
      tmdbId: dbShow.tmdbId,
      title: dbShow.title,
      status: dbShow.status,
      isFavorite: dbShow.isFavorite,
      totalEpisodesTracked,
    } : null,
    details: {
      id: details.id,
      name: details.name,
      overview: details.overview,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      first_air_date: details.first_air_date,
      vote_average: details.vote_average,
      number_of_seasons: details.number_of_seasons,
      number_of_episodes: details.number_of_episodes,
      seasons: details.seasons || [],
      genres: details.genres || [],
      cast,
    },
    season: {
      seasonNumber,
      episodes,
    }
  });
}
