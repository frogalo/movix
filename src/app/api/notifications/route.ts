import { TMDB_BASE_URL } from '@/lib/config';
﻿import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface NotificationItem {
  id: string;
  type: "follow" | "tv_premiere" | "movie_premiere";
  title: string;
  message: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  media?: {
    id: number;
    title: string;
    posterPath: string | null;
    mediaType: "movie" | "tv";
    extraInfo?: string;
  };
  link: string;
  timestamp: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ notifications: [] });
    }

    const currentUserId = session.user.id;
    const apiKey = process.env.TMDB_API_KEY;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Follow Notifications (who started following logged in user)
    const follows = await prisma.follow.findMany({
      where: { followingId: currentUserId },
      include: {
        follower: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const followNotifications: NotificationItem[] = follows.map((f) => ({
      id: `follow-${f.follower.id}-${f.createdAt.getTime()}`,
      type: "follow",
      title: "New Follower",
      message: `${f.follower.name ?? "A member"} started following you`,
      user: f.follower,
      link: `/users/${f.follower.id}`,
      timestamp: f.createdAt.toISOString(),
    }));

    // 2. TV Show Premieres (last 7 days from user's tracked TV shows)
    const userTvShows = await prisma.tvShow.findMany({
      where: { userId: currentUserId },
      select: { id: true, tmdbId: true, title: true, posterPath: true },
      take: 12,
    });

    const tvNotifications: NotificationItem[] = [];

    if (apiKey && userTvShows.length > 0) {
      const tvPromises = userTvShows.map(async (show) => {
        if (!show.tmdbId) return null;
        try {
          const res = await fetch(`${TMDB_BASE_URL}/tv/${show.tmdbId}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            const lastEp = data.last_episode_to_air;
            if (lastEp && lastEp.air_date) {
              const airDate = new Date(lastEp.air_date);
              if (airDate >= sevenDaysAgo && airDate <= new Date()) {
                const sStr = lastEp.season_number.toString().padStart(2, "0");
                const eStr = lastEp.episode_number.toString().padStart(2, "0");
                return {
                  id: `tv-${show.tmdbId}-${lastEp.id}`,
                  type: "tv_premiere" as const,
                  title: "Episode Release",
                  message: `${show.title} S${sStr}E${eStr}${lastEp.name ? ` · "${lastEp.name}"` : ""}`,
                  media: {
                    id: show.tmdbId,
                    title: show.title,
                    posterPath: show.posterPath || data.poster_path || null,
                    mediaType: "tv" as const,
                    extraInfo: `S${sStr} · E${eStr}`,
                  },
                  link: `/tv/${show.tmdbId}`,
                  timestamp: airDate.toISOString(),
                };
              }
            }
          }
        } catch { /* ignore */ }
        return null;
      });

      const tvResults = await Promise.all(tvPromises);
      tvResults.forEach((item) => {
        if (item) tvNotifications.push(item);
      });
    }

    // 3. Movie Watchlist Premieres (last 7 days from user's watchlist)
    const userWatchlist = await prisma.watchlist.findMany({
      where: { userId: currentUserId },
      select: { movieId: true },
      take: 12,
    });

    const movieNotifications: NotificationItem[] = [];

    if (apiKey && userWatchlist.length > 0) {
      const moviePromises = userWatchlist.map(async (w) => {
        try {
          const res = await fetch(`${TMDB_BASE_URL}/movie/${w.movieId}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.release_date) {
              const relDate = new Date(data.release_date);
              if (relDate >= sevenDaysAgo && relDate <= new Date()) {
                return {
                  id: `movie-${data.id}`,
                  type: "movie_premiere" as const,
                  title: "Watchlist Premiere",
                  message: `${data.title} premiered`,
                  media: {
                    id: data.id,
                    title: data.title,
                    posterPath: data.poster_path || null,
                    mediaType: "movie" as const,
                  },
                  link: `/movie/${data.id}`,
                  timestamp: relDate.toISOString(),
                };
              }
            }
          }
        } catch { /* ignore */ }
        return null;
      });

      const movieResults = await Promise.all(moviePromises);
      movieResults.forEach((item) => {
        if (item) movieNotifications.push(item);
      });
    }

    // Combine all notifications and sort descending by timestamp
    const notifications = [...followNotifications, ...tvNotifications, ...movieNotifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}