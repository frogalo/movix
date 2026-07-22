import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "12", 10));
    const skip = (page - 1) * limit;

    const [shows, total] = await Promise.all([
      prisma.tvShow.findMany({
        where: { userId },
        select: {
          id: true,
          tvdbId: true,
          tmdbId: true,
          title: true,
          status: true,
          isFavorite: true,
          posterPath: true,
          backdropPath: true,
          rating: true,
          vote: true,
          updatedAt: true,
          episodes: {
            where: { isWatched: true },
            select: { id: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.tvShow.count({ where: { userId } }),
    ]);

    const formattedShows = shows.map((s) => ({
      id: s.id,
      tvdbId: s.tvdbId,
      tmdbId: s.tmdbId,
      title: s.title,
      status: s.status,
      isFavorite: s.isFavorite,
      posterPath: s.posterPath,
      backdropPath: s.backdropPath,
      rating: s.rating,
      vote: s.vote,
      watchedCount: s.episodes.length,
    }));

    return NextResponse.json({
      shows: formattedShows,
      total,
      hasMore: skip + shows.length < total,
    });
  } catch (error) {
    console.error("[USER_TRACKED_SHOWS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
