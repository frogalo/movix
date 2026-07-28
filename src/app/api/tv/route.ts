import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ tvShows: [] });
    }

    const userId = session.user.id;
    const tvShows = await prisma.tvShow.findMany({
      where: { userId },
      include: {
        episodes: {
          select: {
            id: true,
            seasonNumber: true,
            episodeNumber: true,
            isWatched: true,
            rating: true,
            vote: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(tvShows);
  } catch (error) {
    console.error('[TV_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const { tvdbId, tmdbId, imdbId, title, status, isFavorite, posterPath, backdropPath, vote, rating } = await req.json();

    if (!tvdbId || !title) {
      return new NextResponse('TVDB ID and Title are required', { status: 400 });
    }

    const show = await prisma.tvShow.upsert({
      where: {
        userId_tvdbId: {
          userId,
          tvdbId: Number(tvdbId),
        }
      },
      update: {
        ...(tmdbId !== undefined && { tmdbId: Number(tmdbId) }),
        ...(imdbId !== undefined && { imdbId }),
        ...(status !== undefined && { status }),
        ...(isFavorite !== undefined && { isFavorite: Boolean(isFavorite) }),
        ...(posterPath !== undefined && { posterPath }),
        ...(backdropPath !== undefined && { backdropPath }),
        ...(vote !== undefined && { vote: vote === null ? null : String(vote) }),
        ...(rating !== undefined && { rating: rating === null ? null : Number(rating) }),
      },
      create: {
        userId,
        tvdbId: Number(tvdbId),
        tmdbId: tmdbId ? Number(tmdbId) : null,
        imdbId: imdbId || null,
        title,
        status: status || 'watching',
        isFavorite: isFavorite || false,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        vote: vote || null,
        rating: rating ? Number(rating) : null,
      }
    });

    // Invalidate Watch Next cache for this user
    const globalForWatchNext = globalThis as unknown as {
      watchNextCache?: Map<string, any>;
    };
    if (globalForWatchNext.watchNextCache) {
      globalForWatchNext.watchNextCache.delete(userId);
    }

    return NextResponse.json(show);
  } catch (error) {
    console.error('[TV_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const tvdbId = searchParams.get('tvdbId');

    if (!tvdbId) {
      return new NextResponse('TVDB ID is required', { status: 400 });
    }

    await prisma.tvShow.delete({
      where: {
        userId_tvdbId: {
          userId,
          tvdbId: Number(tvdbId),
        }
      }
    });

    // Invalidate Watch Next cache for this user
    const globalForWatchNext = globalThis as unknown as {
      watchNextCache?: Map<string, any>;
    };
    if (globalForWatchNext.watchNextCache) {
      globalForWatchNext.watchNextCache.delete(userId);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[TV_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
