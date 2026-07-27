"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

function HomeContent() {
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
  const [showGames, setShowGames] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const savedM = localStorage.getItem('filter_show_movies');
    const savedTv = localStorage.getItem('filter_show_tv');
    const savedGames = localStorage.getItem('filter_show_games');
    if (savedM !== null) setShowMovies(savedM === 'true');
    if (savedTv !== null) setShowTv(savedTv === 'true');
    if (savedGames !== null) setShowGames(savedGames === 'true');
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
    if (movie.media_type === 'game') return showGames;
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

    fetchLibrary();

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
  }, []);

  const loadMoreMovies = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    fetch(`/api/trending?page=${nextPage}`)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setMovies(prev => {
          const newMovies = data.results.filter(newM => !prev.some(m => m.id === newM.id));
          return [...prev, ...newMovies];
        });
        setPage(nextPage);
        setIsLoadingMore(false);
      });
  };

  useEffect(() => {
    if (showAll && page === 1) {
      // Fetch multiple pages initially to ensure ultrawide monitors have enough content to trigger scroll
      setIsLoadingMore(true);
      Promise.all([
        fetch(`/api/trending?page=2`).then(res => res.json()),
        fetch(`/api/trending?page=3`).then(res => res.json()),
        fetch(`/api/trending?page=4`).then(res => res.json())
      ]).then(([data2, data3, data4]) => {
        setMovies(prev => {
          const allNew = [...data2.results, ...data3.results, ...data4.results];
          const uniqueNew = allNew.filter((m, i, self) => self.findIndex(s => s.id === m.id) === i);
          const newMovies = uniqueNew.filter(newM => !prev.some(m => m.id === newM.id));
          return [...prev, ...newMovies];
        });
        setPage(4);
        setIsLoadingMore(false);
      });
    }
  }, [showAll, page]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (!showAll) return;
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      loadMoreMovies();
    }
  };

  const handleMovieSelect = (movie: any) => {
    if (movie.media_type === 'tv') {
      setSelectedTvShow(movie);
      setIsTvModalOpen(true);
    } else if (movie.media_type === 'game') {
      setSelectedGameId(movie.id);
      setIsGameModalOpen(true);
    } else {
      setSelectedMovie(movie);
      if (showAll) {
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
      <AnimatePresence>
        {!showAll && (
          <motion.div
            key="hero-section"
            initial={{ opacity: 1, height: "auto" }}
            exit={isMobile ? undefined : { opacity: 0, height: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.5, ease: "easeInOut" }}
            className="w-full origin-top overflow-hidden hidden md:block"
          >
            <HeroSection movie={selectedMovie} userLibrary={userLibrary} onLibraryUpdate={fetchLibrary} onTvShowClick={handleMovieSelect} />
          </motion.div>
        )}
      </AnimatePresence>
      <TrendingMoviesCarousel 
        movies={filteredMovies} 
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
          setSelectedMovie({ id } as any);
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
