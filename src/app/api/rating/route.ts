import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { movieId, rating } = await req.json();
    if (!movieId || rating === undefined) {
      return new NextResponse('Movie ID and rating are required', { status: 400 });
    }

    const newRating = await prisma.rating.upsert({
      where: {
        userId_movieId: {
          userId: session.user.id,
          movieId: Number(movieId),
        },
      },
      update: {
        rating: Number(rating),
      },
      create: {
        userId: session.user.id,
        movieId: Number(movieId),
        rating: Number(rating),
      },
    });

    return NextResponse.json(newRating);
  } catch (error) {
    console.error('[RATING_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get('movieId');
    if (!movieId) {
      return new NextResponse('Movie ID is required', { status: 400 });
    }

    await prisma.rating.delete({
      where: {
        userId_movieId: {
          userId: session.user.id,
          movieId: Number(movieId),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RATING_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
