import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = 6;

    const shows = await prisma.tvShow.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        episodes: true,
      },
    });

    const total = await prisma.tvShow.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      shows,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    console.error('[LIBRARY_SHOWS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
