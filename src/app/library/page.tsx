import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LibraryClient } from "@/components/LibraryClient";

export const dynamic = 'force-dynamic';

const RATINGS_PAGE_SIZE = 6;
const SHOWS_PAGE_SIZE = 6;

async function getMovie(id: number, apiKey: string) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function getTvShowDetails(tmdbId: number, apiKey: string) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function getTvSeasonDetails(tmdbId: number, seasonNum: number, apiKey: string) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${apiKey}`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function resolveShowMetadata(show: any, apiKey: string) {
  if (show.tmdbId && show.posterPath) {
    return show;
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/find/${show.tvdbId}?external_source=tvdb_id&api_key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      const result = data.tv_results?.[0];
      if (result) {
        const tmdbId = result.id;
        const posterPath = result.poster_path;
        const backdropPath = result.backdrop_path;

        const updated = await prisma.tvShow.update({
          where: { id: show.id },
          data: {
            tmdbId,
            posterPath,
            backdropPath,
          },
          include: {
            episodes: true
          }
        });
        return updated;
      }
    }
  } catch (err) {
    console.error(`Failed to resolve metadata for show tvdb:${show.tvdbId}`, err);
  }
  return show;
}

export default async function LibraryPage(props: {
  searchParams: Promise<{
    ratingsPage?: string;
    showsPage?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return (
      <main className="min-h-screen flex items-center justify-center text-red-500">
        TMDB API Key missing.
      </main>
    );
  }

  const searchParams = await props.searchParams;
  const ratingsPage = Math.max(1, Number(searchParams.ratingsPage) || 1);
  const showsPage = Math.max(1, Number(searchParams.showsPage) || 1);

  // 1. Fetch ratings pagination data
  const totalRatings = await prisma.rating.count({ where: { userId } });
  const dbRatings = await prisma.rating.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    skip: (ratingsPage - 1) * RATINGS_PAGE_SIZE,
    take: RATINGS_PAGE_SIZE,
  });

  const ratedMovies = (
    await Promise.all(
      dbRatings.map(async (r) => {
        const m = await getMovie(r.movieId, apiKey);
        if (!m) return null;
        return {
          id: m.id,
          title: m.title,
          poster_path: m.poster_path,
          backdrop_path: m.backdrop_path,
          vote_average: m.vote_average,
          userRating: r.rating,
        };
      })
    )
  ).filter(Boolean);

  // 2. Fetch tracked TV shows pagination data
  const totalShows = await prisma.tvShow.count({ where: { userId } });
  const dbShows = await prisma.tvShow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    skip: (showsPage - 1) * SHOWS_PAGE_SIZE,
    take: SHOWS_PAGE_SIZE,
    include: {
      episodes: true,
    },
  });

  const resolvedDbShows = await Promise.all(
    dbShows.map(show => resolveShowMetadata(show, apiKey))
  );

  // 3. Fetch movies in watchlist (for Watch Next)
  const dbWatchlist = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const watchlistMovies = (
    await Promise.all(
      dbWatchlist.map((w) => getMovie(w.movieId, apiKey))
    )
  ).filter(Boolean);

  const activeShows = await prisma.tvShow.findMany({
    where: {
      userId,
      episodes: {
        some: {
          isWatched: true,
        },
      },
    },
    include: {
      episodes: true,
    },
  });

  const resolvedActiveShows = await Promise.all(
    activeShows.map(show => resolveShowMetadata(show, apiKey))
  );

  // Compute next unwatched episode for each active show
  const watchNextEpisodes = (
    await Promise.all(
      resolvedActiveShows.map(async (show) => {
        if (!show.tmdbId) return null;
        
        // Find latest watched episode (highest season, then highest episode number)
        const watched = show.episodes.filter((e: any) => e.isWatched);
        if (watched.length === 0) return null;

        watched.sort((a: any, b: any) => {
          if (a.seasonNumber !== b.seasonNumber) return b.seasonNumber - a.seasonNumber;
          return b.episodeNumber - a.episodeNumber;
        });
        const latest = watched[0];

        // Fetch show details to check seasons
        const details = await getTvShowDetails(show.tmdbId, apiKey);
        if (!details) return null;

        let nextSeason = latest.seasonNumber;
        let nextEpisode = latest.episodeNumber + 1;

        const currentSeasonMeta = details.seasons?.find((s: any) => s.season_number === latest.seasonNumber);
        if (currentSeasonMeta) {
          if (nextEpisode > currentSeasonMeta.episode_count) {
            const nextSeasonMeta = details.seasons?.find((s: any) => s.season_number === latest.seasonNumber + 1);
            if (nextSeasonMeta) {
              nextSeason = latest.seasonNumber + 1;
              nextEpisode = 1;
            } else {
              // Fully caught up
              return null;
            }
          }
        } else {
          return null;
        }

        // Fetch details of the next season to get the episode overview and still image
        const seasonDetails = await getTvSeasonDetails(show.tmdbId, nextSeason, apiKey);
        const epMeta = seasonDetails?.episodes?.find((e: any) => e.episode_number === nextEpisode);
        if (!epMeta) return null; // No episode details available

        // Determine if it's a future episode
        const airDateStr = epMeta.air_date || null;
        let isFuture = false;
        let daysUntil = 0;
        if (airDateStr) {
          const airDate = new Date(airDateStr);
          if (airDate.getTime() > Date.now()) {
            isFuture = true;
            daysUntil = Math.ceil((airDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          }
        }
        
        if (isFuture && daysUntil > 2) {
          return null; // Next episode is too far away
        }

        // Calculate remaining unwatched episodes count
        const totalEpisodes = details.number_of_episodes || 0;
        const watchedCount = show.episodes.filter((e: any) => e.isWatched).length;
        const remainingCount = Math.max(0, totalEpisodes - watchedCount - 1);
        const episodeRunTime = details.episode_run_time?.[0] || 45;
        const totalWatchTimeMinutes = watchedCount * episodeRunTime;

        // Find last watched date for the show
        const watchedDates = show.episodes
          .filter((e: any) => e.isWatched && e.watchedAt)
          .map((e: any) => new Date(e.watchedAt!).getTime());
        const lastWatchedTime = watchedDates.length > 0 ? Math.max(...watchedDates) : 0;

        // Check if the next episode is NEW (released in last 14 days or upcoming)
        const airDate = airDateStr ? new Date(airDateStr) : null;
        let isNew = false;
        if (airDate) {
           isNew = (Date.now() - airDate.getTime()) < (14 * 24 * 60 * 60 * 1000) || airDate.getTime() > Date.now();
        }

        return {
          showId: show.id,
          showTitle: show.title,
          tmdbId: show.tmdbId,
          seasonNumber: nextSeason,
          episodeNumber: nextEpisode,
          name: epMeta.name || `Episode ${nextEpisode}`,
          overview: epMeta.overview || "No overview available.",
          still_path: epMeta.still_path || show.backdropPath || show.posterPath,
          air_date: airDateStr,
          remainingCount,
          lastWatchedTime,
          isNew: !!isNew,
          isFuture,
          daysUntil,
          totalEpisodesWatched: watchedCount,
          totalWatchTimeMinutes,
        };
      })
    )
  ).filter(Boolean);

  // Sort Watch Next: NEW first, then sort by lastWatchedTime descending
  const sortedWatchNextEpisodes = (watchNextEpisodes as any[]).sort((a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return b.lastWatchedTime - a.lastWatchedTime;
  });

  // 5. Gather ratings & watchlist metadata for client modal checks
  const ratingsMeta = await prisma.rating.findMany({
    where: { userId },
    select: { movieId: true, rating: true }
  });
  
  const watchlistMeta = await prisma.watchlist.findMany({
    where: { userId },
    select: { movieId: true }
  });

  const userLibraryMeta = {
    ratings: ratingsMeta.map(r => ({ movieId: r.movieId, rating: r.rating })),
    watchlists: watchlistMeta.map(w => ({ movieId: w.movieId }))
  };

  return (
    <LibraryClient
      watchlistMovies={watchlistMovies}
      watchNextEpisodes={sortedWatchNextEpisodes}
      ratedMovies={ratedMovies as any}
      trackedShows={resolvedDbShows as any}
      userLibrary={userLibraryMeta}
      ratingsPagination={{
        currentPage: ratingsPage,
        totalPages: Math.ceil(totalRatings / RATINGS_PAGE_SIZE),
        totalItems: totalRatings,
      }}
      showsPagination={{
        currentPage: showsPage,
        totalPages: Math.ceil(totalShows / SHOWS_PAGE_SIZE),
        totalItems: totalShows,
      }}
    />
  );
}
