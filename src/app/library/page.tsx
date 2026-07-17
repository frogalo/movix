import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LibraryClient } from "@/components/library/LibraryClient";

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Gather ratings & watchlist metadata for client modal checks
  const ratingsMeta = await prisma.rating.findMany({
    where: { userId },
    select: { movieId: true, rating: true, vote: true }
  });
  
  const watchlistMeta = await prisma.watchlist.findMany({
    where: { userId },
    select: { movieId: true }
  });

  const userLibraryMeta = {
    ratings: ratingsMeta.map(r => ({ movieId: r.movieId, rating: r.rating, vote: r.vote })),
    watchlists: watchlistMeta.map(w => ({ movieId: w.movieId }))
  };

  return (
    <LibraryClient
      userLibrary={userLibraryMeta}
    />
  );
}
