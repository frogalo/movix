import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface EpisodeDetail {
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string | null;
  timestamp: string;
}

export interface FeedRatingItem {
  type: "rating";
  user: { id: string; name: string | null; image: string | null };
  movieId: number;
  rating: number | null;
  vote: string | null;
  timestamp: string;
}

export interface FeedEpisodeGroupItem {
  type: "episode_group";
  user: { id: string; name: string | null; image: string | null };
  showTitle: string;
  showPosterPath: string | null;
  showTmdbId: number | null;
  episodes: EpisodeDetail[];
  latestTimestamp: string;
}

export type FeedGroupedItem = FeedRatingItem | FeedEpisodeGroupItem;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const currentUserId = session.user.id;

    // Get list of followed user IDs
    const follows = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });

    const followedUserIds = follows.map((f) => f.followingId);

    if (followedUserIds.length === 0) {
      return NextResponse.json({ feed: [], notFollowingAnyone: true });
    }

    // Fetch recent movie ratings from followed public users
    const recentRatings = await prisma.rating.findMany({
      where: {
        user: { isPrivate: false },
        userId: { in: followedUserIds },
      },
      select: {
        movieId: true,
        rating: true,
        vote: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });

    // Fetch recent TV episode watches from followed public users
    const recentEpisodes = await prisma.tvEpisode.findMany({
      where: {
        isWatched: true,
        show: {
          user: { isPrivate: false },
          userId: { in: followedUserIds },
        },
      },
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
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { watchedAt: "desc" },
      take: 60,
    });

    // Merge raw items
    const rawItems = [
      ...recentRatings.map((r) => ({
        kind: "rating" as const,
        user: r.user,
        movieId: r.movieId,
        rating: r.rating,
        vote: r.vote,
        timestamp: r.updatedAt.toISOString(),
      })),
      ...recentEpisodes.map((e) => ({
        kind: "episode" as const,
        user: e.show.user,
        showTitle: e.show.title,
        showPosterPath: e.show.posterPath,
        showTmdbId: e.show.tmdbId,
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
        episodeName: e.name,
        timestamp: (e.watchedAt ?? new Date(0)).toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Group consecutive episodes by user + show title within 24h
    const feed: FeedGroupedItem[] = [];

    for (const item of rawItems) {
      if (item.kind === "rating") {
        feed.push({
          type: "rating",
          user: item.user,
          movieId: item.movieId,
          rating: item.rating,
          vote: item.vote,
          timestamp: item.timestamp,
        });
      } else {
        const last = feed[feed.length - 1];

        const isSameUserAndShow =
          last &&
          last.type === "episode_group" &&
          last.user.id === item.user.id &&
          last.showTitle.toLowerCase().trim() === item.showTitle.toLowerCase().trim();

        const isWithin24Hours =
          last &&
          last.type === "episode_group" &&
          Math.abs(new Date(last.latestTimestamp).getTime() - new Date(item.timestamp).getTime()) <=
            24 * 60 * 60 * 1000;

        if (isSameUserAndShow && isWithin24Hours) {
          last.episodes.push({
            seasonNumber: item.seasonNumber,
            episodeNumber: item.episodeNumber,
            episodeName: item.episodeName,
            timestamp: item.timestamp,
          });

          if (!last.showPosterPath && item.showPosterPath) {
            last.showPosterPath = item.showPosterPath;
          }
        } else {
          feed.push({
            type: "episode_group",
            user: item.user,
            showTitle: item.showTitle,
            showPosterPath: item.showPosterPath,
            showTmdbId: item.showTmdbId,
            episodes: [
              {
                seasonNumber: item.seasonNumber,
                episodeNumber: item.episodeNumber,
                episodeName: item.episodeName,
                timestamp: item.timestamp,
              },
            ],
            latestTimestamp: item.timestamp,
          });
        }
      }
    }

    return NextResponse.json({ feed: feed.slice(0, 40), notFollowingAnyone: false });
  } catch (error) {
    console.error("[SOCIAL_FEED_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}