import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function getTvShowDetails(tmdbId: number, apiKey: string) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
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

          await prisma.tvShow.update({
            where: { id: show.id },
            data: { tmdbId, posterPath, backdropPath }
          });
        }
      }
    } catch (err) {
      console.error(`Failed to find tmdbId for show tvdb:${show.tvdbId}`, err);
    }
  }

  let totalEpisodes = 0;
  if (tmdbId) {
    try {
      const details = await getTvShowDetails(tmdbId, apiKey);
      if (details) {
        totalEpisodes = details.number_of_episodes || 0;
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
  };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = 6;
    const apiKey = process.env.TMDB_API_KEY || '';

    const shows = await prisma.tvShow.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        episodes: true,
      },
    });

    const resolvedShows = await Promise.all(
      shows.map(show => resolveShowMetadata(show, apiKey))
    );

    const total = await prisma.tvShow.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      shows: resolvedShows,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    console.error('[LIBRARY_SHOWS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
