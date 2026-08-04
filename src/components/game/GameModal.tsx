"use client";

import { useEffect, useState, startTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Star, Gamepad2, Play, Check, Trash, Loader2, Plus, Film, Tv, ExternalLink } from "lucide-react";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";

interface GameModalProps {
  gameId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onLibraryUpdate?: () => void;
  onSelectMovieId?: (id: number) => void;
  onSelectTvShowId?: (id: number) => void;
}

export function GameModal({
  gameId,
  isOpen,
  onClose,
  onLibraryUpdate,
  onSelectMovieId,
  onSelectTvShowId,
}: GameModalProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [game, setGame] = useState<any | null>(null);
  const [userGame, setUserGame] = useState<any | null>(null);
  const [linkedMedia, setLinkedMedia] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Tracking form states
  const [status, setStatus] = useState<string>("BACKLOG");
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState<string>("");

  // Adaptation search and link states
  const [showLinker, setShowLinker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingMedia, setIsSearchingMedia] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!gameId || !isOpen) {
      setGame(null);
      setUserGame(null);
      setLinkedMedia([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const detailsRes = await fetch(`/api/search/details?gameId=${gameId}`);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          setGame(detailsData);
        }

        // Fetch User's Tracking status if logged in
        if (isLoggedIn) {
          const userGameRes = await fetch(`/api/games?gameId=${gameId}`);
          if (userGameRes.ok) {
            const ugData = await userGameRes.json();
            setUserGame(ugData);
            if (ugData) {
              setStatus(ugData.status || "BACKLOG");
              setRating(ugData.rating || 0);
              setReview(ugData.review || "");
            } else {
              setStatus("BACKLOG");
              setRating(0);
              setReview("");
            }
          }
        }

        const linksRes = await fetch(`/api/games/match?gameId=${gameId}`);
        if (linksRes.ok) {
          const linksData = await linksRes.json();
          setLinkedMedia(linksData);
        }
      } catch (err) {
        console.error("Error loading game details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, isOpen, isLoggedIn]);

  // Search adaptation movies/TV shows
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingMedia(true);
      try {
        // Use general search but filter out game media type
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter to just movies & TV shows
          const filtered = (data.results || []).filter((r: any) => r.media_type === "movie" || r.media_type === "tv");
          setSearchResults(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error("Error searching media adaptations:", err);
      } finally {
        setIsSearchingMedia(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSaveTracking = async () => {
    if (!game) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          title: game.title,
          status,
          rating: rating > 0 ? rating : undefined,
          review: review || undefined,
          posterPath: game.posterPath,
          backdropPath: game.backdropPath,
          platforms: game.platforms,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUserGame(updated);
        onLibraryUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTracking = async () => {
    if (!game) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/games?gameId=${game.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUserGame(null);
        setStatus("BACKLOG");
        setRating(0);
        setReview("");
        onLibraryUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkMedia = async (media: any) => {
    if (!game) return;
    try {
      const res = await fetch("/api/games/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          gameTitle: game.title,
          mediaType: media.media_type,
          mediaId: media.id,
          mediaTitle: media.title || media.name,
          confidence: 1.0,
        }),
      });

      if (res.ok) {
        const newLink = await res.json();
        setLinkedMedia((prev) => [...prev.filter((l) => !(l.mediaId === media.id && l.mediaType === media.media_type)), newLink]);
        setSearchQuery("");
        setSearchResults([]);
        setShowLinker(false);
      }
    } catch (err) {
      console.error("Link media adaptation error:", err);
    }
  };

  const handleUnlinkMedia = async (mediaId: number, mediaType: string) => {
    if (!game) return;
    try {
      const res = await fetch(`/api/games/match?gameId=${game.id}&mediaType=${mediaType}&mediaId=${mediaId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLinkedMedia((prev) => prev.filter((l) => !(l.mediaId === mediaId && l.mediaType === mediaType)));
      }
    } catch (err) {
      console.error("Unlink media adaptation error:", err);
    }
  };

  if (!mounted || typeof document === "undefined" || !gameId) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-8 overscroll-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="glass-panel relative z-10 flex h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col overflow-y-auto md:overflow-hidden rounded-none md:rounded-[2rem] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:flex-row"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-black/80 hover:scale-105 active:scale-95 touch-manipulation"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {isLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
                <p className="text-zinc-400 text-sm">Loading game details...</p>
              </div>
            ) : game ? (
              <>
                {/* Hero Backdrop (Left side or top) */}
                <div className="relative w-full md:w-[45%] h-[40vh] md:h-full shrink-0 overflow-hidden bg-zinc-950">
                  <div className="absolute inset-0 z-0">
                    <ImageWithLoader
                      src={game.backdropPath || game.posterPath || ""}
                      alt={game.title}
                      className="w-full h-full object-cover opacity-60 md:opacity-80"
                      wrapperClassName="w-full h-full"
                    />
                    {/* Shadow overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950" />
                  </div>

                  {/* Floating Game Cover Card */}
                  <div className="absolute bottom-6 left-6 right-6 z-10 flex gap-4 items-end">
                    <div className="w-24 h-36 md:w-32 md:h-48 shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-xl bg-zinc-900">
                      <ImageWithLoader
                        src={game.posterPath || ""}
                        alt={game.title}
                        className="w-full h-full object-cover"
                        wrapperClassName="w-full h-full"
                      />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 font-medium text-xs border border-yellow-400/20 mb-2">
                        <Gamepad2 className="w-3.5 h-3.5" /> Video Game
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-white leading-tight font-['Space_Grotesk']">
                        {game.title}
                      </h2>
                      {game.releaseDate && (
                        <p className="text-zinc-400 text-xs mt-1">
                          Released: {new Date(game.releaseDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Section (Right side) */}
                <div className="flex-1 flex flex-col overflow-y-auto md:h-[calc(100vh-4rem)] p-6 md:p-10 space-y-8 bg-zinc-950/80 backdrop-blur-md">
                  {/* Genres & Platforms */}
                  <div className="space-y-3">
                    {game.platforms && game.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mr-1">Platforms:</span>
                        {game.platforms.slice(0, 6).map((platform: string) => (
                          <span
                            key={platform}
                            className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    )}
                    {game.genres && game.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mr-1">Genres:</span>
                        {game.genres.map((genre: string) => (
                          <span
                            key={genre}
                            className="text-xs px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary / Plot */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">About the Game</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl font-light">
                      {game.summary || "No description available for this title."}
                    </p>
                  </div>

                  {/* Screenshots gallery */}
                  {game.screenshots && game.screenshots.length > 1 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Screenshots</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {game.screenshots.slice(1, 5).map((shot: string, i: number) => (
                          <div
                            key={i}
                            className="w-56 h-32 shrink-0 rounded-xl overflow-hidden border border-white/5 bg-zinc-900 shadow-md"
                          >
                            <img src={shot} alt="Screenshot" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User Library Tracking form */}
                  {isLoggedIn && (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 max-w-2xl">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        {userGame ? "Update Logged Play" : "Add to Backlog / Played List"}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Status Select */}
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Play Status</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                          >
                            <option value="BACKLOG">Backlog (Plan to Play)</option>
                            <option value="PLAYING">Currently Playing</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DROPPED">Dropped</option>
                          </select>
                        </div>

                        {/* Rating Stars (1-10) */}
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
                            Rating ({rating > 0 ? `${rating}/10` : "No rating"})
                          </label>
                          <div className="flex items-center gap-1 py-1.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`text-zinc-500 hover:text-yellow-400 transition-colors ${
                                  star <= rating ? "text-yellow-400" : ""
                                }`}
                              >
                                <Star className="w-4 h-4 fill-current" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Review Area */}
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Notes / Thoughts</label>
                        <textarea
                          value={review}
                          onChange={(e) => setReview(e.target.value)}
                          placeholder="What did you think of the game? (optional)"
                          rows={3}
                          className="w-full rounded-xl bg-zinc-900 border border-white/15 p-3 text-sm text-white focus:outline-none focus:border-yellow-400 resize-none"
                        />
                      </div>

                      {/* Save/Delete buttons */}
                      <div className="flex gap-2 justify-end pt-2">
                        {userGame && (
                          <button
                            onClick={handleDeleteTracking}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 text-red-400 font-semibold text-xs rounded-xl transition"
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                            Delete Log
                          </button>
                        )}
                        <button
                          onClick={handleSaveTracking}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-400/50 text-black font-bold text-xs rounded-xl transition shadow-lg"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save Entry
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Adaptations Section (Linked movies/shows) */}
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Film className="w-4 h-4" /> Adaptations & Related Media
                      </h3>
                      {isLoggedIn && (
                        <button
                          onClick={() => setShowLinker(!showLinker)}
                          className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> {showLinker ? "Cancel" : "Link Movie/TV Show"}
                        </button>
                      )}
                    </div>

                    {/* Curation Linker UI */}
                    {showLinker && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search adaptations by title (e.g. Witcher)..."
                          className="w-full rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                        />
                        {isSearchingMedia && (
                          <div className="text-zinc-500 text-xs flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-yellow-400" /> Searching...
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden bg-zinc-900/60">
                            {searchResults.map((result) => (
                              <div
                                key={result.id}
                                className="flex justify-between items-center p-3 hover:bg-white/5"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-12 rounded bg-zinc-800 overflow-hidden shrink-0">
                                    {result.poster_path && (
                                      <img
                                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                        className="w-full h-full object-cover"
                                        alt=""
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {result.title || result.name}
                                    </p>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                      {result.media_type === "tv" ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                                      {result.media_type} ({result.release_date ? new Date(result.release_date).getFullYear() : "N/A"})
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleLinkMedia(result)}
                                  className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition"
                                >
                                  Link
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Adaptation List */}
                    {linkedMedia.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {linkedMedia.map((link) => (
                          <div
                            key={link.id}
                            className="flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/5 hover:border-yellow-400/25 transition-all group"
                          >
                            <button
                              onClick={() => {
                                // Navigate to the linked details
                                startTransition(() => {
                                  onClose();
                                  if (link.mediaType === "movie" && onSelectMovieId) {
                                    onSelectMovieId(link.mediaId);
                                  } else if (link.mediaType === "tv" && onSelectTvShowId) {
                                    onSelectTvShowId(link.mediaId);
                                  }
                                });
                              }}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-yellow-400 shrink-0">
                                {link.mediaType === "tv" ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                              </div>
                              <div className="overflow-hidden">
                                <h4 className="text-sm font-bold text-white truncate group-hover:text-yellow-400 transition-colors">
                                  {link.mediaTitle}
                                </h4>
                                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                  Go to {link.mediaType === "tv" ? "TV Show" : "Movie"} <ExternalLink className="w-3 h-3" />
                                </p>
                              </div>
                            </button>

                            {isLoggedIn && (
                              <button
                                onClick={() => handleUnlinkMedia(link.mediaId, link.mediaType)}
                                className="text-zinc-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Link"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic">
                        No movie or TV show adaptations linked to this game yet.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
