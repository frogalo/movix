import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ watchlists: [], ratings: [] });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      // @ts-ignore
      include: {
        watchlists: true,
        ratings: true,
        tvShows: true,
      },
    });

    return NextResponse.json({
      watchlists: (user as any)?.watchlists || [],
      ratings: (user as any)?.ratings || [],
      tvShows: (user as any)?.tvShows || [],
    });
  } catch (error) {
    console.error('[USER_LIBRARY_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
