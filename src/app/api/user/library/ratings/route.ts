import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const RATINGS_PAGE_SIZE = 6;

async function getMovie(id: number, apiKey: string) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const apiKey = process.env.TMDB_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB API Key missing' }, { status: 500 });
    }

    const userId = session.user.id;
    const totalRatings = await prisma.rating.count({ where: { userId } });
    
    const dbRatings = await prisma.rating.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * RATINGS_PAGE_SIZE,
      take: RATINGS_PAGE_SIZE,
    });

    const ratedMovies = (
      await Promise.all(
        dbRatings.map(async (r) => {
          const m = await getMovie(r.movieId, apiKey);
          if (!m) return null;
          return {
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            vote_average: m.vote_average,
            userRating: r.rating,
          };
        })
      )
    ).filter(Boolean);

    return NextResponse.json({
      ratedMovies,
      totalPages: Math.ceil(totalRatings / RATINGS_PAGE_SIZE),
      totalItems: totalRatings,
    });
  } catch (error) {
    console.error('[LIBRARY_RATINGS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
