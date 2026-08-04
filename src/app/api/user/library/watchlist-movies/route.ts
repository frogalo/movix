import { TMDB_BASE_URL } from '@/lib/config';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fetchWithCache } from '@/lib/tmdbCache';

async function getMovie(id: number, apiKey: string) {
  return fetchWithCache(`${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}`, 3600);
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

    const dbWatchlist = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const watchlistMovies = (
      await Promise.all(
        dbWatchlist.map((w) => getMovie(w.movieId, apiKey))
      )
    ).filter(Boolean);

    return NextResponse.json({ watchlistMovies });
  } catch (error) {
    console.error('[LIBRARY_WATCHLIST_MOVIES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
