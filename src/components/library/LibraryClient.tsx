"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";
import { WatchNextSection } from "./WatchNextSection";
import { RatingsSection } from "./RatingsSection";
import { TrackedShowsSection } from "./TrackedShowsSection";

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

  const [isWatchNextLoading, setIsWatchNextLoading] = useState(true);
  const [isRatingsLoading, setIsRatingsLoading] = useState(true);
  const [isShowsLoading, setIsShowsLoading] = useState(true);

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

  // Helper fetch functions
  const fetchWatchNext = useCallback(async () => {
    try {
      setIsWatchNextLoading(true);
      const res = await fetch("/api/user/library/watch-next");
      if (res.ok) {
        const data = await res.json();
        setWatchlistMovies(data.watchlistMovies || []);
        setLocalWatchNext(data.watchNextEpisodes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWatchNextLoading(false);
    }
  }, []);

  const fetchRatings = useCallback(async (page: number) => {
    try {
      setIsRatingsLoading(true);
      const res = await fetch(`/api/user/library/ratings?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setRatedMovies(data.ratedMovies || []);
        setRatingsPagination({
          currentPage: data.ratedMovies.length > 0 ? page : 0,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRatingsLoading(false);
    }
  }, []);

  const fetchShows = useCallback(async () => {
    try {
      setIsShowsLoading(true);
      const res = await fetch(`/api/user/library/shows?page=1`);
      if (res.ok) {
        const data = await res.json();
        setLocalShows(data.shows || []);
        setShowsPage(1);
        setShowsPagination({
          currentPage: 1,
          totalPages: data.totalPages,
          totalItems: data.totalItems,
        });
        setHasMoreShows(1 < data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsShowsLoading(false);
    }
  }, []);

  // On mount
  useEffect(() => {
    fetchWatchNext();
    fetchShows();
  }, [fetchWatchNext, fetchShows]);

  // When ratingsPage changes
  useEffect(() => {
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

  // Load more tracked shows for infinite scroll
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
    fetchRatings(ratingsPage);
    fetchShows();
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
        if (ep.remainingCount === 0) {
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
          loading={isWatchNextLoading}
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
    </main>
  );
}
