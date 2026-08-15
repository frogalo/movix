import { TMDB_BASE_URL } from '@/lib/config';
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from '@/lib/tmdbCache';

interface ProfileStatsSectionProps {
  userId: string;
}

export async function ProfileStatsSection({ userId }: ProfileStatsSectionProps) {
  const apiKey = process.env.TMDB_API_KEY;

  // 1. Get statistics data
  const [ratings, watchedEpisodes] = await Promise.all([
    prisma.rating.findMany({
      where: { userId },
      select: { movieId: true },
    }),
    prisma.tvEpisode.findMany({
      where: {
        show: { userId },
        isWatched: true,
      },
      select: {
        show: {
          select: {
            tmdbId: true,
          },
        },
      },
    }),
  ]);

  const moviesRatedCount = ratings.length;
  const episodesWatchedCount = watchedEpisodes.length;

  // TV Time calculation (minutes)
  let movieMinutes = 0;
  let tvMinutes = 0;

  if (apiKey) {
    // Unique movie runtimes
    const uniqueMovieIds = Array.from(new Set(ratings.map((r) => r.movieId)));
    const movieRuntimes = await Promise.all(
      uniqueMovieIds.map(async (id) => {
        try {
          const data = await fetchWithCache(`${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}`, 86400);
          if (data?.runtime) {
            return data.runtime;
          }
        } catch { /* ignore */ }
        return 120; // fallback
      })
    );
    const movieRuntimeMap = new Map<number, number>();
    uniqueMovieIds.forEach((id, idx) => {
      movieRuntimeMap.set(id, movieRuntimes[idx]);
    });
    ratings.forEach((r) => {
      movieMinutes += movieRuntimeMap.get(r.movieId) || 120;
    });

    // Unique TV show episode runtimes
    const uniqueTvIds = Array.from(
      new Set(watchedEpisodes.map((ep) => ep.show.tmdbId).filter(Boolean))
    ) as number[];
    const tvRuntimes = await Promise.all(
      uniqueTvIds.map(async (id) => {
        try {
          const data = await fetchWithCache(`${TMDB_BASE_URL}/tv/${id}?api_key=${apiKey}`, 86400);
          if (data) {
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
    watchedEpisodes.forEach((ep) => {
      if (ep.show.tmdbId) {
        tvMinutes += tvRuntimeMap.get(ep.show.tmdbId) || 45;
      } else {
        tvMinutes += 45;
      }
    });
  } else {
    // Fallback if apiKey is missing
    movieMinutes = moviesRatedCount * 120;
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

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
        <h3 className="flex items-center gap-3 font-headline-md text-[24px] text-white md:text-[32px]">
          <span
            className="material-symbols-outlined text-[32px] text-purple-400"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            analytics
          </span>
          Viewing Statistics
        </h3>
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
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">
            schedule
          </span>
        </div>

        <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#caf6ff]/20 transition-all">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Movie Watch Time</p>
          <h4 className="text-3xl font-extrabold text-[#caf6ff] font-headline-md truncate" title={movieTimeDisplay}>
            {movieTimeDisplay}
          </h4>
          <p className="text-xs text-zinc-400">
            Time spent watching rated movies.
          </p>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">
            movie
          </span>
        </div>

        <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#d0bcff]/20 transition-all">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">TV Watch Time</p>
          <h4 className="text-3xl font-extrabold text-[#d0bcff] font-headline-md truncate" title={tvTimeDisplay}>
            {tvTimeDisplay}
          </h4>
          <p className="text-xs text-zinc-400">
            Time spent watching tracked series episodes.
          </p>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">
            live_tv
          </span>
        </div>

        <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-[#ffe08b]/20 transition-all">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Movies Rated</p>
          <h4 className="text-3xl font-extrabold text-[#ffe08b] font-headline-md">
            {moviesRatedCount}
          </h4>
          <p className="text-xs text-zinc-400">
            Total number of movies you have rated.
          </p>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">
            star
          </span>
        </div>

        <div className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden group hover:border-pink-400/20 transition-all">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Episodes Watched</p>
          <h4 className="text-3xl font-extrabold text-pink-400 font-headline-md">
            {episodesWatchedCount}
          </h4>
          <p className="text-xs text-zinc-400">
            Total number of TV show episodes you have watched.
          </p>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:scale-110 transition-transform">
            done_all
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProfileStatsSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20" />
          <div className="h-7 w-48 bg-zinc-800 rounded-lg" />
        </div>
        <div className="h-4 w-32 bg-zinc-800/60 rounded" />
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden bg-zinc-900/60 border border-white/5 h-44 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="h-3 w-28 bg-zinc-700/60 rounded" />
              <div className="h-8 w-36 bg-zinc-700/80 rounded-lg" />
            </div>
            <div className="h-3 w-full bg-zinc-800/80 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
