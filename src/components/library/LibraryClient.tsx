"use client";

import { useState, useEffect } from "react";
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
  watchlistMovies: any[];
  watchNextEpisodes: any[];
  ratedMovies: any[];
  trackedShows: any[];
  userLibrary: { watchlists: LibraryEntry[]; ratings: LibraryEntry[] };
  ratingsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  showsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
};

export function LibraryClient({
  watchlistMovies,
  watchNextEpisodes,
  ratedMovies,
  trackedShows,
  userLibrary,
  ratingsPagination,
  showsPagination,
}: LibraryClientProps) {
  const router = useRouter();
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [selectedTvShowId, setSelectedTvShowId] = useState<number | null>(null);
  const [isMarking, setIsMarking] = useState<string | null>(null);
  const [finishedShows, setFinishedShows] = useState<any[]>([]);
  const [localWatchNext, setLocalWatchNext] = useState<any[]>(watchNextEpisodes);
  const [localShows, setLocalShows] = useState<any[]>(trackedShows);
  const [showsPage, setShowsPage] = useState(1);
  const [isLoadingMoreShows, setIsLoadingMoreShows] = useState(false);
  const [hasMoreShows, setHasMoreShows] = useState(showsPagination.currentPage < showsPagination.totalPages);
  const [watchNextLimit, setWatchNextLimit] = useState(5);

  const filteredWatchlistMovies = watchlistMovies.filter(
    (m) => !userLibrary.ratings.some((r) => r.movieId === m.id)
  );

  useEffect(() => {
    setLocalShows(trackedShows);
    setShowsPage(1);
    setHasMoreShows(showsPagination.currentPage < showsPagination.totalPages);
  }, [trackedShows, showsPagination]);

  useEffect(() => {
    setLocalWatchNext(watchNextEpisodes);
  }, [watchNextEpisodes]);

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
  }, [hasMoreShows, isLoadingMoreShows, showsPage]);

  const loadMoreShows = async () => {
    if (isLoadingMoreShows || !hasMoreShows) return;
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMoreShows(false);
    }
  };

  const handleLibraryUpdate = () => {
    router.refresh();
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
    const params = new URLSearchParams(window.location.search);
    params.set(`${type}Page`, pageNum.toString());
    router.push(`/library?${params.toString()}`);
  };

  return (
    <main
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
        />

        <RatingsSection
          ratedMovies={ratedMovies}
          ratingsPagination={ratingsPagination}
          setSelectedMovie={setSelectedMovie}
          setPage={setPage}
        />

        <TrackedShowsSection
          localShows={localShows}
          showsPagination={showsPagination}
          isLoadingMoreShows={isLoadingMoreShows}
          setSelectedTvShowId={setSelectedTvShowId}
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
