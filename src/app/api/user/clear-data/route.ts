import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    // Use transaction to delete user data
    await prisma.$transaction([
      prisma.watchlist.deleteMany({ where: { userId } }),
      prisma.rating.deleteMany({ where: { userId } }),
      prisma.tvShow.deleteMany({ where: { userId } }), // cascadingly deletes tvEpisodes
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CLEAR_DATA_POST]', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
