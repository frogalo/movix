import { TMDB_BASE_URL } from '@/lib/config';
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { UserAvatar } from "@/components/common/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { UserProfileClient } from "@/components/profile/UserProfileClient";
import Link from "next/link";
import { Lock, ArrowLeft, BarChart2, Clock, Film, Tv, Star, CheckCheck } from "lucide-react";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { userId } = await params;

  // Redirect to own profile page
  if (userId === session.user.id) redirect("/profile");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, createdAt: true, isPrivate: true },
  });

  if (!user) notFound();

  const isFollowing = session.user.id
    ? !!(await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: userId,
          },
        },
      }))
    : false;

  if (user.isPrivate) {
    return (
      <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
        <section className="relative overflow-hidden px-6 pt-24 md:px-12 md:pt-16">
          <div className="relative z-10 mx-auto max-w-2xl text-center py-24">
            <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Private Account</h2>
            <p className="text-zinc-400 text-sm mb-2">
              <span className="font-semibold text-white">{user.name ?? "This user"}</span> has set their profile to private.
            </p>
            <p className="text-zinc-600 text-sm">Their ratings, watchlist, and TV shows are not visible.</p>
            <Link href="/social" className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition">
              <ArrowLeft className="w-4 h-4" />
              Back to Social
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const apiKey = process.env.TMDB_API_KEY;

  const [ratingsData, watchedEpisodesData, tvShowsData, totalTvShowsCount, episodesWatchedCount] = await Promise.all([
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
        show: { select: { id: true, tvdbId: true, tmdbId: true, title: true, posterPath: true } },
      },
      orderBy: { watchedAt: "desc" },
      take: 6,
    }),
    prisma.tvShow.findMany({
      where: { userId },
      select: { id: true, tvdbId: true, tmdbId: true, title: true, posterPath: true, backdropPath: true, rating: true, vote: true, status: true, isFavorite: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.tvShow.count({ where: { userId } }),
    prisma.tvEpisode.count({ where: { show: { userId }, isWatched: true } }),
  ]);

  // Resolve any missing poster paths for TV shows in DB and memory
  if (apiKey) {
    const showsNeedingPoster: Array<{ id: string; title: string; tvdbId: number; tmdbId: number | null }> = [];
    const seenShowIds = new Set<string>();

    watchedEpisodesData.forEach((ep) => {
      if (!ep.show.posterPath && !seenShowIds.has(ep.show.id)) {
        seenShowIds.add(ep.show.id);
        showsNeedingPoster.push(ep.show);
      }
    });

    tvShowsData.forEach((s) => {
      if (!s.posterPath && !seenShowIds.has(s.id)) {
        seenShowIds.add(s.id);
        showsNeedingPoster.push(s);
      }
    });

    if (showsNeedingPoster.length > 0) {
      await Promise.all(
        showsNeedingPoster.map(async (s) => {
          try {
            let foundPoster: string | null = null;
            let foundTmdbId: number | null = s.tmdbId;

            if (s.tmdbId) {
              const res = await fetch(`${TMDB_BASE_URL}/tv/${s.tmdbId}?api_key=${apiKey}`, {
                next: { revalidate: 3600 },
              });
              if (res.ok) {
                const data = await res.json();
                foundPoster = data.poster_path || null;
              }
            }

            if (!foundPoster && s.tvdbId) {
              const findRes = await fetch(
                `${TMDB_BASE_URL}/find/${s.tvdbId}?external_source=tvdb_id&api_key=${apiKey}`,
                { next: { revalidate: 3600 } }
              );
              if (findRes.ok) {
                const findData = await findRes.json();
                const match = findData.tv_results?.[0];
                if (match?.poster_path) {
                  foundPoster = match.poster_path;
                  if (!foundTmdbId && match.id) foundTmdbId = match.id;
                }
              }
            }

            if (!foundPoster) {
              const searchRes = await fetch(
                `${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(s.title)}`,
                { next: { revalidate: 3600 } }
              );
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const match = searchData.results?.find((r: any) => r.poster_path);
                if (match?.poster_path) {
                  foundPoster = match.poster_path;
                  if (!foundTmdbId && match.id) foundTmdbId = match.id;
                }
              }
            }

            if (foundPoster) {
              await prisma.tvShow.update({
                where: { id: s.id },
                data: {
                  posterPath: foundPoster,
                  ...(foundTmdbId ? { tmdbId: foundTmdbId } : {}),
                },
              });

              watchedEpisodesData.forEach((ep) => {
                if (ep.show.id === s.id) ep.show.posterPath = foundPoster;
              });
              tvShowsData.forEach((showItem) => {
                if (showItem.id === s.id) showItem.posterPath = foundPoster;
              });
            }
          } catch (e) {
            console.error(`Failed to resolve poster for ${s.title}:`, e);
          }
        })
      );
    }
  }

  const movieInfoObj: Record<number, { posterPath: string | null; title: string }> = {};
  if (apiKey && ratingsData.length > 0) {
    const uniqueIds = [...new Set(ratingsData.slice(0, 12).map((r) => r.movieId))];
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            return { id, posterPath: data.poster_path as string | null, title: data.title as string };
          }
        } catch { /* ignore */ }
        return { id, posterPath: null, title: `Movie #${id}` };
      })
    );
    results.forEach((r) => {
      movieInfoObj[r.id] = { posterPath: r.posterPath, title: r.title };
    });
  }

  // Calculate watch times (minutes)
  let movieMinutes = 0;
  let tvMinutes = 0;

  const allWatchedEpisodes = await prisma.tvEpisode.findMany({
    where: { show: { userId }, isWatched: true },
    select: { show: { select: { tmdbId: true } } },
  });

  if (apiKey) {
    const uniqueMovieIds = Array.from(new Set(ratingsData.map((r) => r.movieId)));
    const movieRuntimes = await Promise.all(
      uniqueMovieIds.map(async (id) => {
        try {
          const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            return data.runtime || 120;
          }
        } catch { /* ignore */ }
        return 120;
      })
    );
    const movieRuntimeMap = new Map<number, number>();
    uniqueMovieIds.forEach((id, idx) => {
      movieRuntimeMap.set(id, movieRuntimes[idx]);
    });
    ratingsData.forEach((r) => {
      movieMinutes += movieRuntimeMap.get(r.movieId) || 120;
    });

    const uniqueTvIds = Array.from(
      new Set(allWatchedEpisodes.map((ep) => ep.show.tmdbId).filter(Boolean))
    ) as number[];
    const tvRuntimes = await Promise.all(
      uniqueTvIds.map(async (id) => {
        try {
          const res = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            const runtime = data.episode_run_time?.[0] || 45;
            return { id, runtime };
          }
        } catch { /* ignore */ }
        return { id, runtime: 45 };
      })
    );
    const tvRuntimeMap = new Map<number, number>();
    tvRuntimes.forEach((item) => {
      tvRuntimeMap.set(item.id, item.runtime);
    });
    allWatchedEpisodes.forEach((ep) => {
      if (ep.show.tmdbId) {
        tvMinutes += tvRuntimeMap.get(ep.show.tmdbId) || 45;
      } else {
        tvMinutes += 45;
      }
    });
  } else {
    movieMinutes = ratingsData.length * 120;
    tvMinutes = episodesWatchedCount * 45;
  }

  const totalMinutes = movieMinutes + tvMinutes;

  const formatMinutes = (minutesCount: number) => {
    const years = Math.floor(minutesCount / (365 * 24 * 60));
    const months = Math.floor((minutesCount % (365 * 24 * 60)) / (30 * 24 * 60));
    const days = Math.floor((minutesCount % (30 * 24 * 60)) / (24 * 60));
    const hours = Math.floor((minutesCount % (24 * 60)) / 60);
    const minutes = minutesCount % 60;

    return [
      years > 0 ? `${years}Y` : "",
      months > 0 ? `${months}M` : "",
      days > 0 ? `${days}D` : "",
      hours > 0 ? `${hours}H` : "",
      `${minutes}MIN`,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const totalTimeDisplay = formatMinutes(totalMinutes);
  const movieTimeDisplay = formatMinutes(movieMinutes);
  const tvTimeDisplay = formatMinutes(tvMinutes);

  const joinedDate = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(user.createdAt);

  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-10 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#ffcc00] blur-[100px] mix-blend-screen" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl mt-4 md:mt-8 flex flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
          <div className="relative group">
            <div className="relative z-10 h-32 w-32 overflow-hidden rounded-full border-2 border-yellow-400/30 bg-zinc-950 p-1 shadow-[0_0_30px_rgba(255,204,0,0.15)] md:h-40 md:w-40 flex items-center justify-center">
              <UserAvatar
                image={user.image}
                name={user.name}
                sizeClassName="w-full h-full"
                textClassName="text-3xl md:text-5xl"
                className="w-full h-full"
              />
            </div>
            <div className="absolute inset-0 -z-10 rounded-full bg-[#ffcc00] opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-40" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black text-[#ffedc3] drop-shadow-lg font-['Space_Grotesk']">
                {user.name ?? "Movix Member"}
              </h1>
              <FollowButton targetUserId={userId} initialIsFollowing={isFollowing} className="self-center md:self-auto" />
            </div>
            <p className="mb-4 text-sm text-zinc-400">Member since {joinedDate}</p>
            <Link
              href="/social"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Social
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-10 px-4 md:px-12 pb-28">
        {/* Stats */}
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
              <BarChart2 className="w-6 h-6 text-purple-400" />
              Viewing Statistics
            </h2>
            <span className="font-label-sm text-[12px] font-bold uppercase text-[#00daf3]">
              Activity Summary
            </span>
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Total Watch Time</p>
              <h4 className="text-3xl font-extrabold text-yellow-400 font-headline-md truncate" title={totalTimeDisplay}>
                {totalTimeDisplay}
              </h4>
              <p className="text-xs text-zinc-400">
                Sum of all rated movies and watched episodes runtimes.
              </p>
              <Clock className="w-20 h-20 absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#caf6ff]/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Movie Watch Time</p>
              <h4 className="text-3xl font-extrabold text-[#caf6ff] font-headline-md truncate" title={movieTimeDisplay}>
                {movieTimeDisplay}
              </h4>
              <p className="text-xs text-zinc-400">
                Time spent watching rated movies.
              </p>
              <Film className="w-20 h-20 absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#d0bcff]/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">TV Watch Time</p>
              <h4 className="text-3xl font-extrabold text-[#d0bcff] font-headline-md truncate" title={tvTimeDisplay}>
                {tvTimeDisplay}
              </h4>
              <p className="text-xs text-zinc-400">
                Time spent watching tracked series episodes.
              </p>
              <Tv className="w-20 h-20 absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#ffe08b]/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Movies Rated</p>
              <h4 className="text-3xl font-extrabold text-[#ffe08b] font-headline-md">
                {ratingsData.length}
              </h4>
              <p className="text-xs text-zinc-400">
                Total number of movies rated.
              </p>
              <Star className="w-20 h-20 absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-pink-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Episodes Watched</p>
              <h4 className="text-3xl font-extrabold text-pink-400 font-headline-md">
                {episodesWatchedCount}
              </h4>
              <p className="text-xs text-zinc-400">
                Total number of TV show episodes watched.
              </p>
              <CheckCheck className="w-20 h-20 absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>

        {/* Client Component with interactive modals, social episode cards, formatted status, & load more */}
        <UserProfileClient
          userId={userId}
          ratingsData={ratingsData.map((r) => ({
            ...r,
            updatedAt: r.updatedAt.toISOString(),
          }))}
          movieInfoMap={movieInfoObj}
          watchedEpisodesData={watchedEpisodesData.map((ep) => ({
            ...ep,
            watchedAt: ep.watchedAt ? ep.watchedAt.toISOString() : null,
          }))}
          initialTvShows={tvShowsData.map((s) => ({
            ...s,
          }))}
          totalTvShowsCount={totalTvShowsCount}
        />

        {ratingsData.length === 0 && watchedEpisodesData.length === 0 && tvShowsData.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <Film className="w-16 h-16 mx-auto mb-3 opacity-30 text-zinc-600" />
            <p className="text-zinc-400 font-medium">No activity yet</p>
            <p className="text-sm mt-1">This user has not rated any movies or tracked any TV shows yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}