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

    // Deleting the user will trigger cascade deletion for ratings, watchlist,
    // accounts, sessions, authenticators, and tv shows via the prisma schema.
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE_ACCOUNT_POST]', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
