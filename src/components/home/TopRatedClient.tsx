"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TopRatedMoviesCarousel } from "@/components/home/TopRatedMoviesCarousel";
import { Movie } from "@/components/home/TrendingMoviesCarousel";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";

type ApiResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};

const GUEST_MAX_PAGE = 2; // Limit non-logged in users to 2 pages (~40 items)

function TopRatedContent() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTvShow, setSelectedTvShow] = useState<any | null>(null);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userLibrary, setUserLibrary] = useState({ watchlists: [], ratings: [], tvShows: [] });
  const [showMovies, setShowMovies] = useState(true);
  const [showTv, setShowTv] = useState(true);
  const [activeGenres, setActiveGenres] = useState<string[]>(["All Genres"]);
  const [activeDecades, setActiveDecades] = useState<string[]>(["All Decades"]);
  const [hideFewVotes, setHideFewVotes] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const isGuestLimitReached = !isLoggedIn && page >= GUEST_MAX_PAGE;

  useEffect(() => {
    const savedM = localStorage.getItem('filter_show_movies');
    const savedTv = localStorage.getItem('filter_show_tv');
    const savedHideFew = localStorage.getItem('filter_hide_few_votes');
    if (savedM !== null) setShowMovies(savedM === 'true');
    if (savedTv !== null) setShowTv(savedTv === 'true');
    if (savedHideFew !== null) setHideFewVotes(savedHideFew === 'true');
  }, []);

  const toggleMovies = () => {
    setShowMovies(prev => {
      const newVal = !prev;
      if (!newVal && !showTv) return prev;
      localStorage.setItem('filter_show_movies', String(newVal));
      return newVal;
    });
  };

  const toggleTv = () => {
    setShowTv(prev => {
      const newVal = !prev;
      if (!newVal && !showMovies) return prev;
      localStorage.setItem('filter_show_tv', String(newVal));
      return newVal;
    });
  };

  const toggleHideFewVotes = () => {
    setShowHideFewVotes: {
      const newVal = !hideFewVotes;
      setHideFewVotes(newVal);
      localStorage.setItem('filter_hide_few_votes', String(newVal));
    }
  };

  const filteredMovies = movies.filter(movie => {
    const isTv = movie.media_type === 'tv' || (!movie.title && !!movie.name);
    const matchesMedia = isTv ? showTv : showMovies;
    if (!matchesMedia) return false;
    if (hideFewVotes) {
      const isInflated = movie.vote_average >= 8.0 && movie.vote_count > 0 && movie.vote_count < 1000;
      if (isInflated) return false;
    }
    return true;
  });

  useEffect(() => {
    const movieId = searchParams.get('movieId');
    const tvId = searchParams.get('tvId');
    if (movieId) {
      fetch(`/api/movie/${movieId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.details) {
            setSelectedMovie(data.details);
            setIsModalOpen(true);
            router.replace('/top-rated', { scroll: false });
          }
        });
    } else if (tvId) {
      fetch(`/api/tv/${tvId}?season=auto`)
        .then(res => res.json())
        .then(data => {
          if (data && data.details) {
            setSelectedTvShow(data.details);
            setIsTvModalOpen(true);
            router.replace('/top-rated', { scroll: false });
          }
        });
    }
  }, [searchParams, router]);

  const fetchLibrary = () => {
    if (!isLoggedIn) return;
    fetch('/api/user/library')
      .then(res => res.json())
      .then(data => setUserLibrary(data || { watchlists: [], ratings: [] }))
      .catch(console.error);
  };

  const fetchTopRated = (pageNum: number, genresList: string[], decadesList: string[]) => {
    const genresQuery = genresList.join(",");
    const decadesQuery = decadesList.join(",");
    return fetch(`/api/top-rated?page=${pageNum}&genres=${genresQuery}&decades=${decadesQuery}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch top rated");
        return res.json();
      });
  };

  const loadData = (genresList: string[], decadesList: string[]) => {
    setIsLoadingMore(true);
    fetchTopRated(1, genresList, decadesList)
      .then((data: ApiResponse) => {
        setMovies(data.results);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchLibrary();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadData(activeGenres, activeDecades);
  }, [activeGenres, activeDecades]);

  const loadMoreMovies = () => {
    if (isLoadingMore || isGuestLimitReached) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const genresQuery = activeGenres.join(",");
    const decadesQuery = activeDecades.join(",");
    fetch(`/api/top-rated?page=${nextPage}&genres=${genresQuery}&decades=${decadesQuery}`)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        if (data?.results?.length) {
          setMovies(prev => {
            const newMovies = data.results.filter(newM => !prev.some(m => m.id === newM.id));
            return [...prev, ...newMovies];
          });
          setPage(nextPage);
        }
      })
      .catch(console.error)
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (isGuestLimitReached) return;
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      loadMoreMovies();
    }
  };

  const handleMovieSelect = (movie: any) => {
    if (movie.media_type === 'tv') {
      setSelectedTvShow(movie);
      setIsTvModalOpen(true);
    } else {
      setSelectedMovie(movie);
      setIsModalOpen(true);
    }
  };

  const toggleGenre = (genre: string) => {
    if (genre === "All Genres") {
      setActiveGenres(["All Genres"]);
      return;
    }

    setActiveGenres(prev => {
      const filtered = prev.filter(g => g !== "All Genres");
      if (filtered.includes(genre)) {
        const next = filtered.filter(g => g !== genre);
        return next.length === 0 ? ["All Genres"] : next;
      } else {
        return [...filtered, genre];
      }
    });
  };

  const toggleDecade = (decade: string) => {
    if (decade === "All Decades") {
      setActiveDecades(["All Decades"]);
      return;
    }

    setActiveDecades(prev => {
      const filtered = prev.filter(d => d !== "All Decades");
      if (filtered.includes(decade)) {
        const next = filtered.filter(d => d !== decade);
        return next.length === 0 ? ["All Decades"] : next;
      } else {
        return [...filtered, decade];
      }
    });
  };

  const resetFilters = () => {
    setActiveGenres(["All Genres"]);
    setActiveDecades(["All Decades"]);
    setHideFewVotes(false);
    localStorage.setItem('filter_hide_few_votes', 'false');
  };

  return (
    <main 
      ref={mainRef}
      onScroll={handleScroll}
      className="md:ml-64 w-full md:w-[calc(100%-16rem)] h-screen overflow-y-auto pb-24 md:pb-8 relative"
    >
      <TopRatedMoviesCarousel 
        movies={filteredMovies} 
        onMovieSelect={handleMovieSelect} 
        isGrid={true}
        userLibrary={userLibrary}
        onLoadMore={loadMoreMovies}
        showMovies={showMovies}
        showTv={showTv}
        onToggleMovies={toggleMovies}
        onToggleTv={toggleTv}
        onLibraryUpdate={fetchLibrary}
        activeGenres={activeGenres}
        activeDecades={activeDecades}
        onToggleGenre={toggleGenre}
        onToggleDecade={toggleDecade}
        onResetFilters={resetFilters}
        hideFewVotes={hideFewVotes}
        onToggleHideFewVotes={toggleHideFewVotes}
      />
      {isLoadingMore && (
        <div className="flex justify-center pb-8">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-yellow-400 animate-spin"></div>
        </div>
      )}
      {isGuestLimitReached && (
        <div className="mx-4 md:mx-12 my-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/60 p-6 md:p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-400 mb-3 border border-yellow-400/25 shadow-lg">
            <span className="material-symbols-outlined text-2xl">lock_open</span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white mb-2">Want to explore more top rated media?</h3>
          <p className="text-xs md:text-sm text-zinc-400 max-w-md mx-auto mb-5">
            You&apos;ve reached the preview limit. Sign in or create a free account to unlock unlimited browsing, custom filters, and full library tracking.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-2.5 text-xs font-bold text-black transition hover:bg-yellow-300 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              Sign In / Register
            </a>
          </div>
        </div>
      )}
      <MovieModal 
        movie={selectedMovie} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userLibrary={userLibrary}
        onLibraryUpdate={fetchLibrary}
      />
      <TvShowModal 
        showId={selectedTvShow?.id} 
        isOpen={isTvModalOpen} 
        onClose={() => setIsTvModalOpen(false)} 
        onLibraryUpdate={fetchLibrary}
      />
    </main>
  );
}

export function TopRatedClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TopRatedContent />
    </Suspense>
  );
}
