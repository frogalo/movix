"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";
// import { GameModal } from "@/components/game/GameModal";
import { WatchNextSection } from "./WatchNextSection";
import { RatingsSection } from "./RatingsSection";
import { TrackedShowsSection } from "./TrackedShowsSection";
// import { TrackedGamesSection } from "./TrackedGamesSection";

// Bump this version whenever the localStorage cache schema changes.
// Old caches with a different version are automatically cleared on mount.
const CACHE_VERSION = "v2";

export type LibraryEntry = {
  movieId: number;
  rating?: number | null;
  vote?: string | null;
};

type LibraryClientProps = {
  userLibrary: { watchlists: LibraryEntry[]; ratings: LibraryEntry[] };
};

export function LibraryClient({
  userLibrary,
}: LibraryClientProps) {
  const router = useRouter();
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [selectedTvShowId, setSelectedTvShowId] = useState<number | null>(null);
  const [isMarking, setIsMarking] = useState<string | null>(null);
  const [finishedShows, setFinishedShows] = useState<any[]>([]);

  const mainRef = useRef<HTMLElement>(null);
  const scrollPosRef = useRef<number>(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);

  // Client states for async loaded sections
  const [watchlistMovies, setWatchlistMovies] = useState<any[]>([]);
  const [localWatchNext, setLocalWatchNext] = useState<any[]>([]);
  const [ratedMovies, setRatedMovies] = useState<any[]>([]);
  const [localShows, setLocalShows] = useState<any[]>([]);
  const [localGames, _setLocalGames] = useState<any[]>([]);

  const [isWatchNextLoading, setIsWatchNextLoading] = useState(true);
  const [isWatchlistMoviesLoading, setIsWatchlistMoviesLoading] = useState(true);
  const [isRatingsLoading, setIsRatingsLoading] = useState(true);
  const [isShowsLoading, setIsShowsLoading] = useState(true);
  const [_isGamesLoading, _setIsGamesLoading] = useState(false);

  const [_selectedGameId, _setSelectedGameId] = useState<number | null>(null);
  const [_isGameModalOpen, _setIsGameModalOpen] = useState(false);

  const [ratingsPagination, setRatingsPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalItems: number;
  } | null>(null);

  const [showsPagination, setShowsPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalItems: number;
  } | null>(null);

  const [ratingsPage, setRatingsPage] = useState(1);
  const [showsPage, setShowsPage] = useState(1);
  const [isLoadingMoreShows, setIsLoadingMoreShows] = useState(false);
  const [hasMoreShows, setHasMoreShows] = useState(false);
  const [watchNextLimit, setWatchNextLimit] = useState(5);

  const filteredWatchlistMovies = watchlistMovies.filter(
    (m) => !userLibrary.ratings.some((r) => r.movieId === m.id)
  );

  // Keep latest states in refs to avoid recreating callback dependencies
  const watchlistMoviesRef = useRef<any[]>([]);
  const localWatchNextRef = useRef<any[]>([]);
  const ratedMoviesRef = useRef<any[]>([]);
  const localShowsRef = useRef<any[]>([]);
  const localGamesRef = useRef<any[]>([]);

  useEffect(() => { watchlistMoviesRef.current = watchlistMovies; }, [watchlistMovies]);
  useEffect(() => { localWatchNextRef.current = localWatchNext; }, [localWatchNext]);
  useEffect(() => { ratedMoviesRef.current = ratedMovies; }, [ratedMovies]);
  useEffect(() => { localShowsRef.current = localShows; }, [localShows]);
  useEffect(() => { localGamesRef.current = localGames; }, [localGames]);

  // Load from localStorage on mount (immediate hydration on client side)
  useEffect(() => {
    try {
      // Invalidate caches from older schema versions
      const storedVersion = localStorage.getItem("lib_cache_version");
      if (storedVersion !== CACHE_VERSION) {
        [
          "lib_watch_next",
          "lib_watchlist_movies",
          "lib_shows",
          "lib_ratings_1",
          "lib_games",
        ].forEach((key) => localStorage.removeItem(key));
        localStorage.setItem("lib_cache_version", CACHE_VERSION);
        // Skip hydration – fresh data will be fetched below
        return;
      }

      const cachedWatchNext = localStorage.getItem("lib_watch_next");
      if (cachedWatchNext) {
        const parsed = JSON.parse(cachedWatchNext);
        if (Array.isArray(parsed)) {
          setLocalWatchNext(parsed);
          setIsWatchNextLoading(false);
        }
      }
      const cachedWatchlist = localStorage.getItem("lib_watchlist_movies");
      if (cachedWatchlist) {
        const parsed = JSON.parse(cachedWatchlist);
        if (Array.isArray(parsed)) {
          setWatchlistMovies(parsed);
          setIsWatchlistMoviesLoading(false);
        }
      }
      const cachedShows = localStorage.getItem("lib_shows");
      if (cachedShows) {
        const parsed = JSON.parse(cachedShows);
        // Guard: must be an object with a `shows` array, not a plain array (old format)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.shows)) {
          setLocalShows(parsed.shows);
          setShowsPagination(parsed.pagination || null);
          setHasMoreShows(1 < (parsed.pagination?.totalPages || 0));
          setIsShowsLoading(false);
        }
      }
      const cachedRatings = localStorage.getItem("lib_ratings_1");
      if (cachedRatings) {
        const parsed = JSON.parse(cachedRatings);
        // Guard: must be an object with a `ratedMovies` array, not a plain array (old format)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.ratedMovies)) {
          setRatedMovies(parsed.ratedMovies);
          setRatingsPagination(parsed.pagination || null);
          setIsRatingsLoading(false);
        }
      }
    } catch (e) {
      console.error("[LOCALSTORAGE_CACHE] Failed to restore library cache:", e);
    }
  }, []);

  // Helper fetch functions
  const fetchWatchNext = useCallback(async () => {
    try {
      setIsWatchNextLoading(localWatchNextRef.current.length === 0);
      const res = await fetch("/api/user/library/watch-next");
      if (res.ok) {
        const data = await res.json();
        const episodes = data.watchNextEpisodes || [];
        setLocalWatchNext(episodes);
        localStorage.setItem("lib_watch_next", JSON.stringify(episodes));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWatchNextLoading(false);
    }
  }, []);

  const fetchWatchlistMovies = useCallback(async () => {
    try {
      setIsWatchlistMoviesLoading(watchlistMoviesRef.current.length === 0);
      const res = await fetch("/api/user/library/watchlist-movies");
      if (res.ok) {
        const data = await res.json();
        const movies = data.watchlistMovies || [];
        setWatchlistMovies(movies);
        localStorage.setItem("lib_watchlist_movies", JSON.stringify(movies));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWatchlistMoviesLoading(false);
    }
  }, []);

  const fetchRatings = useCallback(async (page: number) => {
    try {
      setIsRatingsLoading(page === 1 ? ratedMoviesRef.current.length === 0 : true);
      const res = await fetch(`/api/user/library/ratings?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        const movies = data.ratedMovies || [];
        setRatedMovies(movies);
        const pagination = {
          currentPage: movies.length > 0 ? page : 0,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
        };
        setRatingsPagination(pagination);
        
        if (page === 1) {
          localStorage.setItem("lib_ratings_1", JSON.stringify({ ratedMovies: movies, pagination }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRatingsLoading(false);
    }
  }, []);

  const fetchShows = useCallback(async () => {
    try {
      setIsShowsLoading(localShowsRef.current.length === 0);
      const res = await fetch(`/api/user/library/shows?page=1`);
      if (res.ok) {
        const data = await res.json();
        const shows = data.shows || [];
        setLocalShows(shows);
        setShowsPage(1);
        const pagination = {
          currentPage: 1,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
        };
        setShowsPagination(pagination);
        setHasMoreShows(1 < data.totalPages);
        
        localStorage.setItem("lib_shows", JSON.stringify({ shows, pagination }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsShowsLoading(false);
    }
  }, []);

  // const fetchGames = useCallback(async () => {
  //   try {
  //     setIsGamesLoading(localGamesRef.current.length === 0);
  //     const res = await fetch("/api/games");
  //     if (res.ok) {
  //       const data = await res.json();
  //       const games = data || [];
  //       setLocalGames(games);
  //       localStorage.setItem("lib_games", JSON.stringify(games));
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setIsGamesLoading(false);
  //   }
  // }, []);

  // On mount: fetch all sections in parallel so ratings/shows don't wait on WatchNext
  useEffect(() => {
    fetchWatchNext();
    fetchWatchlistMovies();
    fetchShows();
    fetchRatings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When ratingsPage changes (subsequent changes, skipping initial mount)
  const isFirstRatingsMount = useRef(true);
  useEffect(() => {
    if (isFirstRatingsMount.current) {
      isFirstRatingsMount.current = false;
      return;
    }
    fetchRatings(ratingsPage);
  }, [ratingsPage, fetchRatings]);

  // Capture scroll position when a modal is opened
  useEffect(() => {
    if (selectedTvShowId || selectedMovie) {
      if (mainRef.current) {
        scrollPosRef.current = mainRef.current.scrollTop;
      }
    }
  }, [selectedTvShowId, selectedMovie]);

  // Flag that scroll needs restoration when modal is closed
  useEffect(() => {
    if (!selectedTvShowId && !selectedMovie && scrollPosRef.current > 0) {
      setShouldRestoreScroll(true);
    }
  }, [selectedTvShowId, selectedMovie]);

  // Restore scroll position once updates are completed
  useEffect(() => {
    if (shouldRestoreScroll && !isWatchNextLoading && !isRatingsLoading && !isShowsLoading) {
      if (mainRef.current) {
        mainRef.current.scrollTop = scrollPosRef.current;
        scrollPosRef.current = 0;
      }
      setShouldRestoreScroll(false);
    }
  }, [shouldRestoreScroll, isWatchNextLoading, isRatingsLoading, isShowsLoading]);

  const loadMoreShows = async () => {
    if (isLoadingMoreShows || !hasMoreShows || !showsPagination) return;
    setIsLoadingMoreShows(true);
    const nextPage = showsPage + 1;
    try {
      const res = await fetch(`/api/user/library/shows?page=${nextPage}`);
      if (res.ok) {
        const data = await res.json();
        setLocalShows((prev) => {
          const newShows = data.shows.filter((newS: any) => !prev.some((s) => s.id === newS.id));
          return [...prev, ...newShows];
        });
        setShowsPage(nextPage);
        setHasMoreShows(nextPage < data.totalPages);
        setShowsPagination({
          currentPage: nextPage,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMoreShows(false);
    }
  };

  // Scroll listener for infinite scroll
  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;
      if (scrollHeight - scrollTop <= clientHeight + 250) {
        loadMoreShows();
      }
    };
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreShows, isLoadingMoreShows, showsPage, showsPagination]);

  const handleLibraryUpdate = () => {
    router.refresh();
    fetchWatchNext();
    fetchWatchlistMovies();
    fetchRatings(ratingsPage);
    fetchShows();
    // fetchGames();
  };

  const handleMarkWatched = async (ep: any) => {
    const showId = ep.showId;
    if (isMarking === showId) return;
    setIsMarking(showId);
    try {
      const res = await fetch("/api/tv/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: ep.tmdbId,
          showTitle: ep.showTitle,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          isWatched: true,
        }),
      });
      if (res.ok) {
        if (ep.isLastEpisodeOfLastSeason) {
          setLocalWatchNext((prev) => prev.filter((e) => e.showId !== showId));
          setFinishedShows((prev) => [...prev, ep]);
        } else {
          const nextRes = await fetch(`/api/tv/watch-next?showId=${showId}`);
          if (nextRes.ok) {
            const nextEp = await nextRes.json();
            if (nextEp) {
              setLocalWatchNext((prev) => prev.map((e) => e.showId === showId ? nextEp : e));
            } else {
              setLocalWatchNext((prev) => prev.filter((e) => e.showId !== showId));
            }
          } else {
            setLocalWatchNext((prev) => prev.filter((e) => e.showId !== showId));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMarking(null);
    }
  };

  const setPage = (type: "ratings" | "shows", pageNum: number) => {
    if (type === "ratings") {
      setRatingsPage(pageNum);
    } else {
      setShowsPage(pageNum);
    }
  };

  return (
    <main
      ref={mainRef}
      onScroll={(e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 250) {
          loadMoreShows();
        }
      }}
      className="relative h-screen min-w-0 max-w-full overflow-x-hidden overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12"
    >
      <section className="mx-auto max-w-[1600px] space-y-12 px-4 pt-24 md:px-12 md:pt-12 pb-28 md:pb-24">
        <WatchNextSection
          localWatchNext={localWatchNext}
          finishedShows={finishedShows}
          filteredWatchlistMovies={filteredWatchlistMovies}
          watchNextLimit={watchNextLimit}
          setWatchNextLimit={setWatchNextLimit}
          isMarking={isMarking}
          handleMarkWatched={handleMarkWatched}
          setSelectedTvShowId={setSelectedTvShowId}
          setSelectedMovie={setSelectedMovie}
          watchNextLoading={isWatchNextLoading}
          watchlistMoviesLoading={isWatchlistMoviesLoading}
        />

        <RatingsSection
          ratedMovies={ratedMovies}
          ratingsPagination={ratingsPagination}
          setSelectedMovie={setSelectedMovie}
          setPage={setPage}
          loading={isRatingsLoading}
        />

        <TrackedShowsSection
          localShows={localShows}
          showsPagination={showsPagination}
          isLoadingMoreShows={isLoadingMoreShows}
          setSelectedTvShowId={setSelectedTvShowId}
          loading={isShowsLoading}
        />

        {/* <TrackedGamesSection
          localGames={localGames}
          setSelectedGameId={(id) => {
            setSelectedGameId(id);
            setIsGameModalOpen(true);
          }}
          loading={isGamesLoading}
        /> */}
      </section>

      {/* Movie Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        userLibrary={userLibrary}
        onLibraryUpdate={handleLibraryUpdate}
      />

      {/* TV Show Modal */}
      <TvShowModal
        showId={selectedTvShowId}
        isOpen={!!selectedTvShowId}
        onClose={() => setSelectedTvShowId(null)}
        onLibraryUpdate={handleLibraryUpdate}
      />

      {/* <GameModal
        gameId={selectedGameId}
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        onLibraryUpdate={handleLibraryUpdate}
        onSelectMovieId={(id) => {
          setSelectedMovie({ id });
        }}
        onSelectTvShowId={(id) => {
          setSelectedTvShowId(id);
        }}
      /> */}
    </main>
  );
}
