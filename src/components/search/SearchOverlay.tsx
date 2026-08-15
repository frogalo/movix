"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ImageWithLoader } from '@/components/common/ImageWithLoader';
import { MovieModal } from '@/components/movie/MovieModal';
import { TvShowModal } from '@/components/tv/TvShowModal';
import { GameModal } from '@/components/game/GameModal';
import { ActorModal } from '@/components/person/ActorModal';
import { UserAvatar } from '@/components/common/UserAvatar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export function SearchOverlay() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [selectedTvShowId, setSelectedTvShowId] = useState<number | string | null>(null);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [isActorModalOpen, setIsActorModalOpen] = useState(false);
  const [userLibrary, setUserLibrary] = useState<{ watchlists: any[]; ratings: any[] }>({ watchlists: [], ratings: [] });

  const fetchLibrary = () => {
    fetch('/api/user/library')
      .then(res => res.json())
      .then(data => setUserLibrary(data || { watchlists: [], ratings: [] }))
      .catch(console.error);
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => res.json())
      .then(data => {
        const validResults = data.results?.filter((r: any) => 
          (r.media_type === 'person' && (r.profile_path || r.name)) || 
          r.poster_path || 
          r.backdrop_path
        ) || [];
        setResults(validResults.slice(0, 8));
      })
      .catch(console.error)
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus mobile input when overlay opens
  useEffect(() => {
    if (mobileOpen && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [mobileOpen]);

  useEffect(() => {
    const handleOpenSearch = () => setMobileOpen(true);
    window.addEventListener('open-mobile-search', handleOpenSearch);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('open-mobile-search', handleOpenSearch);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSelect = (item: any) => {
    setShowDropdown(false);
    setMobileOpen(false);
    setQuery('');

    if (item.media_type === 'person') {
      setSelectedActorId(item.id);
      setIsActorModalOpen(true);
      return;
    }

    if (item.media_type === 'game') {
      setSelectedGameId(item.id);
      setIsGameModalOpen(true);
      return;
    }

    const isTv = item.media_type === 'tv' || (!item.title && !!item.name);
    if (isTv) {
      setSelectedTvShowId(item.id);
      setIsTvModalOpen(true);
    } else {
      const formattedMovie = {
        ...item,
        title: item.title || item.name,
        release_date: item.release_date || item.first_air_date,
      };
      setSelectedMovie(formattedMovie);
      setIsMovieModalOpen(true);
    }
  };

  const handleLibraryUpdate = () => {
    fetchLibrary();
    router.refresh();
    window.dispatchEvent(new Event('library-updated'));
  };

  const ResultsList = () => {
    const getPosterUrl = (result: any) => {
      const path = result.poster_path || result.backdrop_path || result.profile_path;
      if (!path) return 'https://via.placeholder.com/92x138?text=No+Image';
      if (path.startsWith('http')) return path;
      return `https://image.tmdb.org/t/p/w92${path}`;
    };

    const getMediaLabel = (result: any) => {
      if (result.media_type === 'game') return 'Game';
      if (result.media_type === 'tv') return 'TV Series';
      if (result.media_type === 'person') return result.known_for_department || 'Actor';
      return 'Movie';
    };

    return (
      <>
        {query.length > 0 && query.length < 3 ? (
          <div className="px-4 py-6 text-center text-zinc-500 text-sm">Please type at least 3 characters</div>
        ) : results.length === 0 && !isSearching && query.length >= 3 ? (
          <div className="px-4 py-6 text-center text-zinc-500 text-sm">No results found for &ldquo;{query}&rdquo;</div>
        ) : (
          results.map((result) => (
            <div 
              key={`${result.media_type || 'item'}-${result.id}`}
              onClick={() => handleSelect(result)}
              className="px-4 py-3 flex items-center gap-3 hover:bg-white/10 active:bg-white/15 cursor-pointer transition-colors touch-manipulation"
            >
              <ImageWithLoader 
                src={getPosterUrl(result)} 
                alt={result.title || result.name} 
                className="w-full h-full object-cover rounded-lg"
                wrapperClassName="w-11 h-16 shrink-0 shadow-md bg-zinc-800 rounded-lg"
                loaderSize={20}
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-white text-sm font-semibold truncate">{result.title || result.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">{getMediaLabel(result)}</span>
                  {(result.release_date || result.first_air_date) && (
                    <>
                      <span className="text-[10px] text-zinc-500">•</span>
                      <span className="text-[10px] text-zinc-400">
                        {result.release_date ? result.release_date.split('-')[0] : (result.first_air_date ? result.first_air_date.split('-')[0] : '')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </>
    );
  };

  return (
    <>
      {/* Mobile: Fullscreen search overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-[80] bg-zinc-950/98 backdrop-blur-xl flex flex-col overscroll-none safe-top"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <button
                onClick={() => { setMobileOpen(false); setQuery(''); }}
                className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 active:bg-white/10 transition-colors touch-manipulation shrink-0"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className="flex-1 relative">
                <input
                  ref={mobileInputRef}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base outline-none placeholder-zinc-500 focus:border-yellow-400/50 transition-colors"
                  placeholder="Search movies, TV shows..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && results.length > 0) {
                      handleSelect(results[0]);
                    }
                  }}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-white/20 border-t-tertiary rounded-full animate-spin"></div>
                )}
              </div>
            </div>
            <div 
              className="flex-1 overflow-y-auto overscroll-none"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setMobileOpen(false);
                }
              }}
            >
              <ResultsList />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: Inline search bar */}
      <div ref={containerRef} className="hidden md:flex absolute top-6 right-8 z-50 flex-col items-end">
        <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2 border border-white/10 hover:border-tertiary/50 transition-colors focus-within:border-tertiary focus-within:shadow-[0_0_15px_rgba(47,230,255,0.2)] w-80 relative bg-background/80 backdrop-blur-xl">
          <span className="material-symbols-outlined text-zinc-400">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-white font-body-md text-body-md w-full placeholder-zinc-500 outline-none"
            placeholder="Search movies, TV shows..."
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results.length > 0) {
                handleSelect(results[0]);
              }
            }}
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-white/20 border-t-tertiary rounded-full animate-spin absolute right-[88px]"></div>
          )}
          <div className="flex items-center gap-3 pl-3 ml-2 border-l border-white/10 shrink-0">
            {session?.user && <NotificationCenter />}
            <Link href={session?.user ? "/profile" : "/login"} className="shrink-0 flex items-center justify-center">
              {session?.user ? (
                <UserAvatar
                  image={session.user.image}
                  name={session.user.name}
                  email={session.user.email}
                  sizeClassName="w-9 h-9"
                  textClassName="text-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors shrink-0" title="Sign In">
                  <span className="material-symbols-outlined text-zinc-400 text-[18px]">person</span>
                </div>
              )}
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {showDropdown && query.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-3 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2"
            >
              <ResultsList />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MovieModal 
        movie={selectedMovie} 
        isOpen={isMovieModalOpen} 
        onClose={() => setIsMovieModalOpen(false)} 
        userLibrary={userLibrary}
        onLibraryUpdate={handleLibraryUpdate}
      />
      <TvShowModal 
        showId={selectedTvShowId} 
        isOpen={isTvModalOpen} 
        onClose={() => setIsTvModalOpen(false)} 
        onLibraryUpdate={handleLibraryUpdate}
      />
      <GameModal
        gameId={selectedGameId}
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        onLibraryUpdate={handleLibraryUpdate}
        onSelectMovieId={(id) => {
          setSelectedMovie({ id });
          setIsMovieModalOpen(true);
        }}
        onSelectTvShowId={(id) => {
          setSelectedTvShowId(id);
          setIsTvModalOpen(true);
        }}
      />
      <ActorModal
        personId={selectedActorId}
        isOpen={isActorModalOpen}
        onClose={() => {
          setIsActorModalOpen(false);
          setSelectedActorId(null);
        }}
        onSelectMovie={(movie) => {
          setIsActorModalOpen(false);
          setSelectedMovie(movie);
          setIsMovieModalOpen(true);
        }}
        onSelectTvShow={(showId) => {
          setIsActorModalOpen(false);
          setSelectedTvShowId(showId);
          setIsTvModalOpen(true);
        }}
      />
    </>
  );
}

