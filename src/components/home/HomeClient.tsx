"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeroSection } from "@/components/home/HeroSection";
import { TrendingMoviesCarousel, Movie } from "@/components/home/TrendingMoviesCarousel";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";
import { GameModal } from "@/components/game/GameModal";
import { motion, AnimatePresence } from "framer-motion";

type ApiResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};

const GUEST_MAX_PAGE = 2; // Limit non-logged in users to 2 pages (~40 items)

function HomeContent() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTvShow, setSelectedTvShow] = useState<any | null>(null);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userLibrary, setUserLibrary] = useState({ watchlists: [], ratings: [], tvShows: [], games: [] });
  const [isMobile, setIsMobile] = useState(false);
  const [showMovies, setShowMovies] = useState(true);
  const [showTv, setShowTv] = useState(true);
  const [showGames, setShowGames] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const isGuestLimitReached = !isLoggedIn && page >= GUEST_MAX_PAGE;

  useEffect(() => {
    const savedM = localStorage.getItem('filter_show_movies');
    const savedTv = localStorage.getItem('filter_show_tv');
    if (savedM !== null) setShowMovies(savedM === 'true');
    if (savedTv !== null) setShowTv(savedTv === 'true');
    setShowGames(false);
  }, []);

  const toggleMovies = () => {
    setShowMovies(prev => {
      const newVal = !prev;
      if (!newVal && !showTv && !showGames) return prev;
      localStorage.setItem('filter_show_movies', String(newVal));
      return newVal;
    });
  };

  const toggleTv = () => {
    setShowTv(prev => {
      const newVal = !prev;
      if (!newVal && !showMovies && !showGames) return prev;
      localStorage.setItem('filter_show_tv', String(newVal));
      return newVal;
    });
  };

  const toggleGames = () => {
    setShowGames(prev => {
      const newVal = !prev;
      if (!newVal && !showMovies && !showTv) return prev;
      localStorage.setItem('filter_show_games', String(newVal));
      return newVal;
    });
  };

  const filteredMovies = movies.filter(movie => {
    if (movie.media_type === 'game') return false;
    const isTv = movie.media_type === 'tv' || (!movie.title && !!movie.name);
    return isTv ? showTv : showMovies;
  });

  useEffect(() => {
    if (filteredMovies.length > 0) {
      const currentMatchesFilter = selectedMovie && (
        selectedMovie.media_type === 'game'
          ? showGames
          : ((selectedMovie.media_type === 'tv' || (!selectedMovie.title && !!selectedMovie.name)) ? showTv : showMovies)
      );
      if (!currentMatchesFilter) {
        setSelectedMovie(filteredMovies[0]);
      }
    }
  }, [filteredMovies, showMovies, showTv, showGames, selectedMovie]);

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
            router.replace('/', { scroll: false });
          }
        });
    } else if (tvId) {
      fetch(`/api/tv/${tvId}?season=auto`)
        .then(res => res.json())
        .then(data => {
          if (data && data.details) {
            setSelectedTvShow(data.details);
            setIsTvModalOpen(true);
            router.replace('/', { scroll: false });
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowAll(true);
      setIsMobile(true);
    }

    if (isLoggedIn) {
      fetchLibrary();
    }

    fetch(`/api/trending?page=1`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trending");
        return res.json();
      })
      .then((data: ApiResponse) => {
        setMovies(data.results);
        if (data.results.length > 0) {
          setSelectedMovie(data.results[0]);
        }
      })
      .catch(console.error);
  }, [isLoggedIn]);

  const loadMoreMovies = () => {
    if (isLoadingMore || isGuestLimitReached) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    fetch(`/api/trending?page=${nextPage}`)
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
    if (!showAll || isGuestLimitReached) return;
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      loadMoreMovies();
    }
  };

  const handleMovieSelect = (movie: any) => {
    if (!showAll) {
      // When Big Hero is still open, selecting any movie/show updates the hero and does NOT open modals
      setSelectedMovie(movie);
      if (movie.media_type === 'tv' || (!movie.title && !!movie.name)) {
        setSelectedTvShow(movie);
      } else if (movie.media_type === 'game') {
        setSelectedGameId(movie.id);
      }
    } else {
      // When hero is closed (in grid view), clicking cards opens the appropriate modal
      if (movie.media_type === 'tv' || (!movie.title && !!movie.name)) {
        setSelectedTvShow(movie);
        setIsTvModalOpen(true);
      } else if (movie.media_type === 'game') {
        setSelectedGameId(movie.id);
        setIsGameModalOpen(true);
      } else {
        setSelectedMovie(movie);
        setIsModalOpen(true);
      }
    }
  };

  // Wheel support (desktop)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    const handleWheel = (e: WheelEvent) => {
      if (isModalOpen || isTvModalOpen) return;
      if (!showAll && e.deltaY > 20) {
        setShowAll(true);
      } else if (showAll && e.deltaY < -20) {
        if (mainRef.current && mainRef.current.scrollTop <= 0) {
          setShowAll(false);
        }
      }
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [showAll, isModalOpen, isTvModalOpen]);

  // Touch/swipe support (mobile)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isModalOpen || isTvModalOpen) return;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      const elapsed = Date.now() - touchStartTime;

      // Require a minimum swipe distance (50px) and maximum time (400ms)
      if (Math.abs(deltaY) < 50 || elapsed > 400) return;

      if (!showAll && deltaY > 0) {
        // Swipe up → show grid
        setShowAll(true);
      } else if (showAll && deltaY < 0) {
        // Swipe down → show hero (only when scrolled to top)
        if (mainRef.current && mainRef.current.scrollTop <= 0) {
          setShowAll(false);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showAll, isModalOpen, isTvModalOpen]);

  return (
    <main 
      ref={mainRef}
      onScroll={handleScroll}
      className={`md:ml-64 w-full md:w-[calc(100%-16rem)] relative ${showAll ? 'h-screen overflow-y-auto pb-24 md:pb-8' : 'h-screen overflow-hidden'}`}
    >
      <AnimatePresence initial={false}>
        {!showAll && (
          <motion.div
            key="hero-section"
            initial={isMobile ? undefined : { height: 0, opacity: 0 }}
            animate={isMobile ? undefined : { height: "auto", opacity: 1 }}
            exit={isMobile ? undefined : { height: 0, opacity: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full origin-top overflow-hidden hidden md:block shrink-0"
          >
            <HeroSection 
              movie={selectedMovie} 
              userLibrary={userLibrary} 
              onLibraryUpdate={fetchLibrary} 
              onTvShowClick={(tv) => {
                setSelectedTvShow(tv);
                setIsTvModalOpen(true);
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
      <TrendingMoviesCarousel 
        movies={filteredMovies} 
        selectedMovieId={selectedMovie?.id}
        onMovieSelect={handleMovieSelect} 
        isGrid={showAll}
        onToggleGrid={() => setShowAll(!showAll)}
        userLibrary={userLibrary}
        onLoadMore={loadMoreMovies}
        showMovies={showMovies}
        showTv={showTv}
        showGames={showGames}
        onToggleMovies={toggleMovies}
        onToggleTv={toggleTv}
        onToggleGames={toggleGames}
      />
      {isLoadingMore && showAll && (
        <div className="flex justify-center pb-8">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-yellow-400 animate-spin"></div>
        </div>
      )}

      {isGuestLimitReached && showAll && (
        <div className="mx-4 md:mx-12 my-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/60 p-6 md:p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-400 mb-3 border border-yellow-400/25 shadow-lg">
            <span className="material-symbols-outlined text-2xl">lock_open</span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white mb-2">Want to explore more?</h3>
          <p className="text-xs md:text-sm text-zinc-400 max-w-md mx-auto mb-5">
            You&apos;ve reached the preview limit. Sign in or create a free account to unlock unlimited browsing, track episodes, and save your watchlist.
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
      <GameModal
        gameId={selectedGameId}
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        onLibraryUpdate={fetchLibrary}
        onSelectMovieId={(id) => {
          setSelectedMovie({ id } as Movie);
          setIsModalOpen(true);
        }}
        onSelectTvShowId={(id) => {
          setSelectedTvShow({ id });
          setIsTvModalOpen(true);
        }}
      />
    </main>
  );
}

export function HomeClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
