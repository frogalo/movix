import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { FollowButton } from "@/components/social/FollowButton";
import Link from "next/link";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";

interface Props {
  params: Promise<{ userId: string }>;
}

function formatMinutes(minutesCount: number): string {
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
  ].filter(Boolean).join(" ");
}

export default async function UserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
              <span className="material-symbols-outlined text-5xl text-zinc-600">lock</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Private Account</h2>
            <p className="text-zinc-400 text-sm mb-2">
              <span className="font-semibold text-white">{user.name ?? "This user"}</span> has set their profile to private.
            </p>
            <p className="text-zinc-600 text-sm">Their ratings, watchlist, and TV shows are not visible.</p>
            <Link href="/social" className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Social
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const apiKey = process.env.TMDB_API_KEY;

  const [ratingsData, watchedEpisodesData, tvShowsData, episodesWatchedCount] = await Promise.all([
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
        show: { select: { title: true, posterPath: true, tmdbId: true } },
      },
      orderBy: { watchedAt: "desc" },
      take: 6,
    }),
    prisma.tvShow.findMany({
      where: { userId },
      select: { title: true, posterPath: true, tmdbId: true, rating: true, vote: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.tvEpisode.count({ where: { show: { userId }, isWatched: true } }),
  ]);

  // Fetch movie info for latest ratings
  type MovieInfo = { posterPath: string | null; title: string };
  let movieInfoMap = new Map<number, MovieInfo>();
  if (apiKey && ratingsData.length > 0) {
    const uniqueIds = [...new Set(ratingsData.slice(0, 6).map((r) => r.movieId))];
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            return { id, posterPath: data.poster_path as string | null, title: data.title as string };
          }
        } catch {}
        return { id, posterPath: null, title: `Movie #${id}` };
      })
    );
    results.forEach((r) => movieInfoMap.set(r.id, { posterPath: r.posterPath, title: r.title }));
  }

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
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
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
              <span className="material-symbols-outlined text-purple-400" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
              Stats
            </h2>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="glass-panel space-y-2 rounded-2xl p-5 relative overflow-hidden group hover:border-yellow-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Movies Rated</p>
              <h3 className="text-3xl font-extrabold text-yellow-400">{ratingsData.length}</h3>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">star</span>
            </div>
            <div className="glass-panel space-y-2 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Episodes Watched</p>
              <h3 className="text-3xl font-extrabold text-purple-400">{episodesWatchedCount}</h3>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">live_tv</span>
            </div>
            <div className="glass-panel space-y-2 rounded-2xl p-5 relative overflow-hidden group hover:border-teal-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Shows Tracked</p>
              <h3 className="text-3xl font-extrabold text-teal-400">{tvShowsData.length}</h3>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">tv</span>
            </div>
          </div>
        </div>

        {/* Latest Movie Ratings */}
        {ratingsData.length > 0 && (
          <div>
            <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
              <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
                <span className="material-symbols-outlined text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
                Latest Rated Movies
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {ratingsData.slice(0, 6).map((r, idx) => {
                const info = movieInfoMap.get(r.movieId);
                const posterUrl = info?.posterPath ? TMDB_IMAGE_BASE + info.posterPath : null;
                return (
                  <div key={idx} className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 border border-white/5 hover:border-yellow-400/30 transition-all">
                    {posterUrl ? (
                      <ImageWithLoader
                        src={posterUrl}
                        alt={info?.title ?? "Movie"}
                        className="w-full h-full object-cover"
                        wrapperClassName="w-full h-full"
                        loaderSize={12}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-zinc-700 text-3xl">movie</span>
                      </div>
                    )}
                    {/* Rating overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      {r.rating && (
                        <span className="flex items-center gap-0.5 text-yellow-400 font-bold text-xs">
                          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          {r.rating}/10
                        </span>
                      )}
                      {info?.title && (
                        <p className="text-white text-[10px] font-medium truncate">{info.title}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Latest Episodes Watched */}
        {watchedEpisodesData.length > 0 && (
          <div>
            <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
              <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
                <span className="material-symbols-outlined text-teal-400" style={{ fontVariationSettings: "'FILL' 1" }}>live_tv</span>
                Recently Watched Episodes
              </h2>
            </div>
            <div className="space-y-3">
              {watchedEpisodesData.map((ep, idx) => {
                const posterUrl = ep.show.posterPath ? TMDB_IMAGE_BASE + ep.show.posterPath : null;
                return (
                  <div key={idx} className="flex gap-3 p-3 rounded-xl glass-panel border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shrink-0">
                      {posterUrl ? (
                        <ImageWithLoader src={posterUrl} alt={ep.show.title} className="w-full h-full object-cover" wrapperClassName="w-full h-full" loaderSize={10} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-zinc-700 text-[16px]">live_tv</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{ep.show.title}</p>
                      <p className="text-xs text-zinc-400">
                        S{ep.seasonNumber.toString().padStart(2, "0")}E{ep.episodeNumber.toString().padStart(2, "0")}
                        {ep.name ? ` · ${ep.name}` : ""}
                      </p>
                      {ep.watchedAt && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {new Date(ep.watchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TV Shows Tracked */}
        {tvShowsData.length > 0 && (
          <div>
            <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
              <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white">
                <span className="material-symbols-outlined text-pink-400" style={{ fontVariationSettings: "'FILL' 1" }}>tv</span>
                Tracked Shows
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {tvShowsData.map((show, idx) => {
                const posterUrl = show.posterPath ? TMDB_IMAGE_BASE + show.posterPath : null;
                const statusColors: Record<string, string> = {
                  watching: "text-teal-400",
                  completed: "text-emerald-400",
                  plan_to_watch: "text-blue-400",
                  dropped: "text-red-400",
                  not_started_yet: "text-zinc-400",
                };
                const statusLabels: Record<string, string> = {
                  watching: "Watching",
                  completed: "Completed",
                  plan_to_watch: "Plan to Watch",
                  dropped: "Dropped",
                  not_started_yet: "Not Started",
                };
                return (
                  <div key={idx} className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 border border-white/5 hover:border-purple-400/30 transition-all">
                    {posterUrl ? (
                      <ImageWithLoader
                        src={posterUrl}
                        alt={show.title}
                        className="w-full h-full object-cover"
                        wrapperClassName="w-full h-full"
                        loaderSize={12}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-zinc-700 text-3xl">tv</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      {show.rating && (
                        <span className="flex items-center gap-0.5 text-yellow-400 font-bold text-xs">
                          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          {show.rating}/10
                        </span>
                      )}
                      <p className={`text-[10px] font-bold ${statusColors[show.status] ?? "text-zinc-400"}`}>
                        {statusLabels[show.status] ?? show.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {ratingsData.length === 0 && watchedEpisodesData.length === 0 && tvShowsData.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <span className="material-symbols-outlined text-6xl mb-3 block opacity-30">playlist_remove</span>
            <p className="text-zinc-400 font-medium">No activity yet</p>
            <p className="text-sm mt-1">This user has not rated any movies or tracked any TV shows yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}