import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        watchlists: true,
        ratings: true,
        tvShows: {
          include: {
            episodes: true
          }
        }
      }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const exportPayload = {
      watchlists: user.watchlists.map(w => ({
        movieId: w.movieId,
        createdAt: w.createdAt
      })),
      ratings: user.ratings.map(r => ({
        movieId: r.movieId,
        rating: r.rating,
        createdAt: r.createdAt
      })),
      tvShows: user.tvShows.map(s => ({
        title: s.title,
        tvdbId: s.tvdbId,
        tmdbId: s.tmdbId,
        imdbId: s.imdbId,
        status: s.status,
        isFavorite: s.isFavorite,
        posterPath: s.posterPath,
        backdropPath: s.backdropPath,
        vote: s.vote,
        rating: s.rating,
        episodes: s.episodes.map(e => ({
          tvdbId: e.tvdbId,
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
          name: e.name,
          isWatched: e.isWatched,
          watchedAt: e.watchedAt,
          rewatchCount: e.rewatchCount,
          vote: e.vote,
          rating: e.rating
        }))
      }))
    };

    return NextResponse.json(exportPayload);
  } catch (error: any) {
    console.error('[EXPORT_DATA_GET]', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
