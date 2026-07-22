import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        isPrivate: true,
      },
    });

    if (!user) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (user.isPrivate) {
      return NextResponse.json({ isPrivate: true, user: { id: user.id, name: user.name, image: user.image } });
    }

    const [ratingsData, watchedEpisodesData, tvShowsData, episodesWatchedCount, tvShowsCount] = await Promise.all([
      prisma.rating.findMany({
        where: { userId },
        select: { movieId: true, rating: true, vote: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.tvEpisode.findMany({
        where: { show: { userId }, isWatched: true },
        select: {
          seasonNumber: true,
          episodeNumber: true,
          name: true,
          watchedAt: true,
          show: {
            select: {
              title: true,
              posterPath: true,
              tmdbId: true,
              tvdbId: true,
            },
          },
        },
        orderBy: { watchedAt: "desc" },
        take: 6,
      }),
      prisma.tvShow.findMany({
        where: { userId },
        select: {
          title: true,
          posterPath: true,
          tmdbId: true,
          rating: true,
          vote: true,
          status: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.tvEpisode.count({ where: { show: { userId }, isWatched: true } }),
      prisma.tvShow.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      isPrivate: false,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
      },
      stats: {
        moviesRated: ratingsData.length,
        episodesWatched: episodesWatchedCount,
        tvShowsTracked: tvShowsCount,
      },
      latestRatings: ratingsData.slice(0, 6),
      latestEpisodes: watchedEpisodesData,
      tvShows: tvShowsData,
    });
  } catch (error) {
    console.error("[SOCIAL_PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}