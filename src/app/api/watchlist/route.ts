import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { movieId } = await req.json();
    if (!movieId) {
      return new NextResponse('Movie ID is required', { status: 400 });
    }

    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_movieId: {
          userId: session.user.id,
          movieId: Number(movieId),
        },
      },
    });

    if (existing) {
      await prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ added: false });
    } else {
      await prisma.watchlist.create({
        data: {
          userId: session.user.id,
          movieId: Number(movieId),
        },
      });
      return NextResponse.json({ added: true });
    }
  } catch (error) {
    console.error('[WATCHLIST_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
