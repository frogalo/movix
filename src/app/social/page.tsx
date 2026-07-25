import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserSearch, UserPlus, Search } from "lucide-react";
import {
  SocialFeedClient,
  FeedGroupedItem,
  FeedRatingItem,
  FeedEpisodeGroupItem,
  DayGroup,
} from "@/components/social/SocialFeedClient";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

function formatDayHeader(dateStr: string): string {
  const itemDate = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: itemDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(itemDate);
  }
}

async function getFeedWithPosters(feed: FeedGroupedItem[], apiKey: string | undefined) {
  const movieIds = [
    ...new Set(
      feed
        .filter((i): i is FeedRatingItem => i.type === "rating")
        .map((i) => i.movieId)
    ),
  ];

  const moviePosters = apiKey
    ? await Promise.all(
        movieIds.map(async (id) => {
          try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`, {
              next: { revalidate: 3600 },
            });
            if (res.ok) {
              const data = await res.json();
              return {
                id,
                posterPath: data.poster_path as string | null,
                backdropPath: data.backdrop_path as string | null,
                title: data.title as string,
              };
            }
          } catch {}
          return { id, posterPath: null, backdropPath: null, title: null };
        })
      )
    : [];

  const movieMap = new Map(moviePosters.map((p) => [p.id, p]));

  const tvPosterMap = new Map<string, string>();
  const tvBackdropMap = new Map<string, string>();
  const tvGroupsNeedingPoster = feed.filter(
    (i): i is FeedEpisodeGroupItem =>
      i.type === "episode_group" && (!i.showPosterPath || !i.showPosterPath.startsWith("/"))
  );

  if (apiKey && tvGroupsNeedingPoster.length > 0) {
    const uniqueTvKeys = [
      ...new Map(
        tvGroupsNeedingPoster.map((s) => [
          s.showTitle.toLowerCase().trim(),
          { title: s.showTitle, tmdbId: s.showTmdbId },
        ])
      ).values(),
    ];

    await Promise.all(
      uniqueTvKeys.map(async (item) => {
        try {
          if (item.tmdbId) {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${item.tmdbId}?api_key=${apiKey}`, {
              next: { revalidate: 3600 },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.poster_path) {
                tvPosterMap.set(item.title.toLowerCase().trim(), data.poster_path);
              }
              if (data.backdrop_path) {
                tvBackdropMap.set(item.title.toLowerCase().trim(), data.backdrop_path);
              }
              if (data.poster_path || data.backdrop_path) return;
            }
          }

          const searchRes = await fetch(
            `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(item.title)}`,
            { next: { revalidate: 3600 } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const match = searchData.results?.find((r: any) => r.poster_path);
            if (match?.poster_path) {
              tvPosterMap.set(item.title.toLowerCase().trim(), match.poster_path);
            }
            if (match?.backdrop_path) {
              tvBackdropMap.set(item.title.toLowerCase().trim(), match.backdrop_path);
            }
          }
        } catch {}
      })
    );
  }

  return feed.map((item) => {
    if (item.type === "rating") {
      const info = movieMap.get(item.movieId);
      return {
        ...item,
        posterUrl: info?.posterPath ? TMDB_IMAGE_BASE + info.posterPath : null,
        backdropUrl: info?.backdropPath ? TMDB_BACKDROP_BASE + info.backdropPath : null,
        movieTitle: info?.title ?? null,
      };
    }

    const key = item.showTitle.toLowerCase().trim();
    const fetchedPoster = tvPosterMap.get(key);
    const fetchedBackdrop = tvBackdropMap.get(key);
    const posterPath = item.showPosterPath || fetchedPoster;

    return {
      ...item,
      posterUrl: posterPath ? (posterPath.startsWith("http") ? posterPath : TMDB_IMAGE_BASE + posterPath) : null,
      backdropUrl: fetchedBackdrop ? TMDB_BACKDROP_BASE + fetchedBackdrop : null,
    };
  });
}

export default async function SocialPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentUserId = session.user.id;
  const apiKey = process.env.TMDB_API_KEY;

  // Get list of followed user IDs
  const follows = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });

  const followedUserIds = follows.map((f) => f.followingId);

  if (followedUserIds.length === 0) {
    return (
      <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
        <section className="relative overflow-hidden px-6 pb-8 pt-24 md:px-12 md:pt-16">
          <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
            <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px]" />
            <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-[#ffcc00] blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white font-['Space_Grotesk'] mb-1">
                  Social
                </h1>
              </div>
              <Link
                href="/social/search"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider transition self-start sm:self-auto"
              >
                <UserSearch className="w-4 h-4" />
                Find Friends
              </Link>
            </div>

            <div className="text-center py-24 text-zinc-500 glass-panel rounded-2xl border border-white/5 p-8">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-yellow-400/60" />
              <p className="text-xl font-bold text-white mb-2">You aren&apos;t following anyone yet</p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
                Search for other Movix members and follow them to see their movie ratings and TV show activity here.
              </p>
              <Link
                href="/social/search"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold uppercase tracking-wider transition shadow-[0_0_20px_rgba(255,204,0,0.3)]"
              >
                <Search className="w-4 h-4" />
                Find Friends to Follow
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [myRatings, myWatchedEpisodes, recentRatings, recentEpisodes] = await Promise.all([
    prisma.rating.findMany({
      where: { userId: currentUserId },
      select: { movieId: true, rating: true },
    }),
    prisma.tvEpisode.findMany({
      where: {
        show: { userId: currentUserId },
        isWatched: true,
      },
      select: {
        seasonNumber: true,
        episodeNumber: true,
        show: { select: { title: true, tmdbId: true } },
      },
    }),
    prisma.rating.findMany({
      where: {
        user: { isPrivate: false },
        userId: { in: followedUserIds },
      },
      select: {
        movieId: true,
        rating: true,
        vote: true,
        updatedAt: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.tvEpisode.findMany({
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
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
      orderBy: { watchedAt: "desc" },
      take: 60,
    }),
  ]);

  const myRatingMapObj: Record<number, number | null> = {};
  myRatings.forEach((r) => {
    myRatingMapObj[r.movieId] = r.rating;
  });

  const myWatchedShowKeysArr = [
    ...new Set(myWatchedEpisodes.map((e) => e.show.title.toLowerCase().trim())),
  ];

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

  // Group episode watches for same show within 24h
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

      const isSameShow =
        last &&
        last.type === "episode_group" &&
        last.showTitle.toLowerCase().trim() === item.showTitle.toLowerCase().trim();

      const isWithin24Hours =
        last &&
        last.type === "episode_group" &&
        Math.abs(new Date(last.latestTimestamp).getTime() - new Date(item.timestamp).getTime()) <=
          24 * 60 * 60 * 1000;

      if (isSameShow && isWithin24Hours) {
        last.episodes.push({
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          episodeName: item.episodeName,
          timestamp: item.timestamp,
          user: item.user,
        });

        if (!last.users.some((u) => u.id === item.user.id)) {
          last.users.push(item.user);
        }

        if (!last.showPosterPath && item.showPosterPath) {
          last.showPosterPath = item.showPosterPath;
        }
      } else {
        feed.push({
          type: "episode_group",
          showTitle: item.showTitle,
          showPosterPath: item.showPosterPath,
          showTmdbId: item.showTmdbId,
          users: [item.user],
          episodes: [
            {
              seasonNumber: item.seasonNumber,
              episodeNumber: item.episodeNumber,
              episodeName: item.episodeName,
              timestamp: item.timestamp,
              user: item.user,
            },
          ],
          latestTimestamp: item.timestamp,
        });
      }
    }
  }

  const feedWithPosters = await getFeedWithPosters(feed.slice(0, 40), apiKey);

  // Group items by Day Sections
  const groupedByDay: { dayLabel: string; items: typeof feedWithPosters }[] = [];

  for (const item of feedWithPosters) {
    const timestamp = item.type === "rating" ? item.timestamp : item.latestTimestamp;
    const dayLabel = formatDayHeader(timestamp);

    const existingGroup = groupedByDay.find((g) => g.dayLabel === dayLabel);
    if (existingGroup) {
      existingGroup.items.push(item);
    } else {
      groupedByDay.push({ dayLabel, items: [item] });
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      <section className="relative overflow-hidden px-6 pb-8 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-[#ffcc00] blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white font-['Space_Grotesk'] mb-1">
                Social
              </h1>
            </div>
            <Link
              href="/social/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider transition self-start sm:self-auto"
            >
              <UserSearch className="w-4 h-4" />
              Find Friends
            </Link>
          </div>

          {feedWithPosters.length === 0 ? (
            <div className="text-center py-24 text-zinc-500 glass-panel rounded-2xl border border-white/5 p-8">
              <span className="material-symbols-outlined text-7xl mb-4 block opacity-30">feed</span>
              <p className="text-lg font-semibold text-zinc-400 mb-2">No recent activity</p>
              <p className="text-sm text-zinc-600">
                The members you follow haven&apos;t rated any movies or watched any episodes recently.
              </p>
            </div>
          ) : (
            <SocialFeedClient
              groupedByDay={groupedByDay}
              myRatingMapObj={myRatingMapObj}
              myWatchedShowKeysArr={myWatchedShowKeysArr}
            />
          )}
        </div>
      </section>
    </main>
  );
}