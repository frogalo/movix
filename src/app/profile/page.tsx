import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { prisma } from "@/lib/prisma";
import { ImageWithLoader } from "@/components/ImageWithLoader";
import { ProfileActions } from "@/components/ProfileActions";

export default async function Profile() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const apiKey = process.env.TMDB_API_KEY;

  // 1. Get statistics data
  // Movies rated count
  const ratings = await prisma.rating.findMany({
    where: { userId },
    select: { movieId: true }
  });
  const moviesRatedCount = ratings.length;

  // Episodes watched count
  const watchedEpisodes = await prisma.tvEpisode.findMany({
    where: {
      show: { userId },
      isWatched: true
    },
    select: {
      show: {
        select: {
          tmdbId: true
        }
      }
    }
  });
  const episodesWatchedCount = watchedEpisodes.length;

  // TV Time calculation (minutes)
  let totalMinutes = 0;

  if (apiKey) {
    // Unique movie runtimes
    const uniqueMovieIds = Array.from(new Set(ratings.map(r => r.movieId)));
    const movieRuntimes = await Promise.all(
      uniqueMovieIds.map(async (id) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`, {
            next: { revalidate: 3600 }
          });
          if (res.ok) {
            const data = await res.json();
            return data.runtime || 120;
          }
        } catch {}
        return 120; // fallback
      })
    );
    const movieRuntimeMap = new Map<number, number>();
    uniqueMovieIds.forEach((id, idx) => {
      movieRuntimeMap.set(id, movieRuntimes[idx]);
    });
    ratings.forEach(r => {
      totalMinutes += movieRuntimeMap.get(r.movieId) || 120;
    });

    // Unique TV show episode runtimes
    const uniqueTvIds = Array.from(new Set(watchedEpisodes.map(ep => ep.show.tmdbId).filter(Boolean))) as number[];
    const tvRuntimes = await Promise.all(
      uniqueTvIds.map(async (id) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}`, {
            next: { revalidate: 3600 }
          });
          if (res.ok) {
            const data = await res.json();
            const runtime = data.episode_run_time?.[0] || 45;
            return { id, runtime };
          }
        } catch {}
        return { id, runtime: 45 };
      })
    );
    const tvRuntimeMap = new Map<number, number>();
    tvRuntimes.forEach(item => {
      tvRuntimeMap.set(item.id, item.runtime);
    });
    watchedEpisodes.forEach(ep => {
      if (ep.show.tmdbId) {
        totalMinutes += tvRuntimeMap.get(ep.show.tmdbId) || 45;
      } else {
        totalMinutes += 45;
      }
    });
  } else {
    // Hard fallback if apiKey is missing
    totalMinutes = (moviesRatedCount * 120) + (episodesWatchedCount * 45);
  }

  // Format TV Time
  const years = Math.floor(totalMinutes / (365 * 24 * 60));
  const months = Math.floor((totalMinutes % (365 * 24 * 60)) / (30 * 24 * 60));
  const days = Math.floor((totalMinutes % (30 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const tvTimeDisplay = [
    years > 0 ? `${years}Y` : '',
    months > 0 ? `${months}M` : '',
    days > 0 ? `${days}D` : '',
    hours > 0 ? `${hours}H` : '',
    `${minutes}MIN`,
  ].filter(Boolean).join(' ');

  const joinedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);
  const avatarUrl =
    user.image ??
    `https://ui-avatars.com/api/?background=171717&color=ffcc00&name=${encodeURIComponent(
      user.name ?? user.email,
    )}`;

  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      <section className="relative overflow-hidden px-6 pb-12 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#ffcc00] blur-[100px] mix-blend-screen" />
        </div>

        <div className="relative z-10 mx-auto mt-4 md:mt-12 flex max-w-7xl flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
          <div className="relative group">
            <div className="relative z-10 h-32 w-32 overflow-hidden rounded-full border-2 border-yellow-400/30 bg-zinc-900 p-1 shadow-[0_0_30px_rgba(255,204,0,0.15)] md:h-40 md:w-40">
              <ImageWithLoader
                alt="User Avatar"
                className="h-full w-full rounded-full object-cover grayscale-[20%] transition-all duration-500 group-hover:grayscale-0"
                src={avatarUrl}
                loaderSize={40}
              />
            </div>
            <div className="absolute inset-0 -z-10 rounded-full bg-[#ffcc00] opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-40" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="mb-2 font-headline-lg text-[28px] md:text-headline-lg text-[#ffedc3] drop-shadow-lg">
              {user.name ?? "movix member"}
            </h2>
            <p className="mb-1 md:mb-2 font-body-md md:font-body-lg text-[14px] md:text-body-lg text-zinc-400">{user.email}</p>
            <p className="mb-4 md:mb-6 max-w-2xl font-body-md md:font-body-lg text-[13px] md:text-body-lg text-zinc-400">
              Account active since {joinedDate}.
            </p>
          </div>
          <div className="mt-4 flex flex-row gap-3 md:mt-0 md:flex-col">
            <a
              href="/login"
              className="popcorn-btn flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-label-sm text-[12px] font-bold uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
              Manage Login
            </a>
            <SignOutButton
              className="glass-panel flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-label-sm text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
              label="Sign Out"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-8 md:space-y-12 px-4 md:px-12 pb-28 md:pb-24">
        {/* Statistics section */}
        <div>
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
              <span className="material-symbols-outlined text-[32px] text-purple-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                analytics
              </span>
              Viewing Statistics
            </h3>
            <span className="font-label-sm text-[12px] font-bold uppercase text-[#00daf3]">
              Activity Summary
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Total TV Time</p>
              <h4 className="text-3xl font-extrabold text-yellow-400 font-headline-md">
                {tvTimeDisplay}
              </h4>
              <p className="text-xs text-zinc-400">
                Sum of all rated movies and watched episodes runtimes.
              </p>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">schedule</span>
            </div>

            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#9cf0ff]/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Movies Rated</p>
              <h4 className="text-3xl font-extrabold text-[#9cf0ff] font-headline-md">
                {moviesRatedCount}
              </h4>
              <p className="text-xs text-zinc-400">
                Total number of movies you have rated.
              </p>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">star</span>
            </div>

            <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-400/20 transition-all">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Episodes Watched</p>
              <h4 className="text-3xl font-extrabold text-purple-400 font-headline-md">
                {episodesWatchedCount}
              </h4>
              <p className="text-xs text-zinc-400">
                Total number of TV show episodes you have watched.
              </p>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">live_tv</span>
            </div>
          </div>
        </div>

        {/* User Account Settings, Import & Export Actions */}
        <ProfileActions />
      </section>
    </main>
  );
}
