"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

function TopRatedContent() {
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

  const mainRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const savedM = localStorage.getItem('filter_show_movies');
    const savedTv = localStorage.getItem('filter_show_tv');
    if (savedM !== null) setShowMovies(savedM === 'true');
    if (savedTv !== null) setShowTv(savedTv === 'true');
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

  const filteredMovies = movies.filter(movie => {
    const isTv = movie.media_type === 'tv' || (!movie.title && !!movie.name);
    return isTv ? showTv : showMovies;
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
        setIsLoadingMore(false);

        // Fetch pages 2, 3, 4 immediately to ensure vertical scrollability
        Promise.all([
          fetchTopRated(2, genresList, decadesList),
          fetchTopRated(3, genresList, decadesList),
          fetchTopRated(4, genresList, decadesList)
        ]).then(([data2, data3, data4]) => {
          setMovies(prev => {
            const allNew = [...data2.results, ...data3.results, ...data4.results];
            const uniqueNew = allNew.filter((m, i, self) => self.findIndex(s => s.id === m.id) === i);
            const newMovies = uniqueNew.filter(newM => !prev.some(m => m.id === newM.id));
            return [...prev, ...newMovies];
          });
          setPage(4);
        });
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  useEffect(() => {
    loadData(activeGenres, activeDecades);
  }, [activeGenres, activeDecades]);

  const loadMoreMovies = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const genresQuery = activeGenres.join(",");
    const decadesQuery = activeDecades.join(",");
    fetch(`/api/top-rated?page=${nextPage}&genres=${genresQuery}&decades=${decadesQuery}`)
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

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
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
      />
      {isLoadingMore && (
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
