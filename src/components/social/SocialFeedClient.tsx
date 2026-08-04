"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, CheckCircle2, Film, Tv } from "lucide-react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";

import type {
  EpisodeDetail,
  FeedRatingItem,
  FeedEpisodeGroupItem,
  FeedGroupedItem,
} from "@/app/api/social/feed/route";

export type {
  EpisodeDetail,
  FeedRatingItem,
  FeedEpisodeGroupItem,
  FeedGroupedItem,
};

export interface DayGroup {
  dayLabel: string;
  items: FeedGroupedItem[];
}

interface SocialFeedClientProps {
  groupedByDay: DayGroup[];
  myRatingMapObj: Record<number, number | null>;
  myWatchedShowKeysArr: string[];
}

function formatTimeAgo(timestampStr: string): string {
  try {
    const date = new Date(timestampStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  } catch {
    return "";
  }
}

export function SocialFeedClient({
  groupedByDay,
  myRatingMapObj,
  myWatchedShowKeysArr,
}: SocialFeedClientProps) {
  // Modal states
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [selectedTvShowId, setSelectedTvShowId] = useState<number | null>(null);

  const [userLibrary, setUserLibrary] = useState<{ watchlists: any[]; ratings: any[] }>({
    watchlists: [],
    ratings: [],
  });

  const myWatchedShowKeys = new Set(myWatchedShowKeysArr);

  const fetchUserLibrary = async () => {
    try {
      const res = await fetch("/api/user/library");
      if (res.ok) {
        const data = await res.json();
        setUserLibrary({
          watchlists: data.watchlists || [],
          ratings: data.ratings || [],
        });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchUserLibrary();
  }, []);

  const handleCoverClick = async (item: FeedGroupedItem) => {
    const isRating = item.type === "rating";

    if (isRating) {
      if (item.movieId) {
        setSelectedMovie({
          id: item.movieId,
          title: item.movieTitle || `Movie #${item.movieId}`,
          poster_path: item.posterUrl ? item.posterUrl.replace("https://image.tmdb.org/t/p/w300", "") : null,
        });
      }
    } else {
      let tmdbId = item.showTmdbId;

      if (!tmdbId && item.showTitle) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(item.showTitle)}`);
          if (res.ok) {
            const searchData = await res.json();
            const tvMatch = searchData.results?.find(
              (r: any) => r.media_type === "tv" || r.first_air_date
            );
            if (tvMatch) tmdbId = tvMatch.id;
          }
        } catch { /* ignore */ }
      }

      if (tmdbId) {
        setSelectedTvShowId(tmdbId);
      }
    }
  };

  return (
    <>
      <div className="space-y-6">
        {groupedByDay.map((dayGroup, dayIdx) => (
          <div key={dayIdx}>
            {/* Horizontal Day Separator */}
            <div className="flex items-center gap-4 pt-2 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/90 font-mono">
                {dayGroup.dayLabel}
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-400/30 via-white/10 to-transparent" />
            </div>

            {/* Feed Items for this day — grid on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {dayGroup.items.map((item, idx) => {
                const isRating = item.type === "rating";
                const posterUrl = item.posterUrl;
                const backdropUrl = item.backdropUrl;
                const cardImageUrl = backdropUrl || posterUrl;
                const movieTitle = isRating ? item.movieTitle : null;
                const ratingItem = isRating ? item : null;
                const groupItem = !isRating ? item : null;

                // Group episodes by season & episode number to deduplicate rows
                const uniqueEpisodeMap = new Map<string, {
                  seasonNumber: number;
                  episodeNumber: number;
                  episodeName: string | null;
                  users: Array<{ id: string; name: string | null; image: string | null }>;
                }>();

                if (!isRating && groupItem) {
                  groupItem.episodes.forEach((ep) => {
                    const key = `S${ep.seasonNumber}-E${ep.episodeNumber}`;
                    if (!uniqueEpisodeMap.has(key)) {
                      uniqueEpisodeMap.set(key, {
                        seasonNumber: ep.seasonNumber,
                        episodeNumber: ep.episodeNumber,
                        episodeName: ep.episodeName,
                        users: [],
                      });
                    }
                    const row = uniqueEpisodeMap.get(key)!;
                    const epUser = ep.user;
                    if (epUser && !row.users.some((u) => u.id === epUser.id)) {
                      row.users.push(epUser);
                    }
                  });
                }

                const uniqueEpisodeRows = Array.from(uniqueEpisodeMap.values()).sort(
                  (a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber
                );

                const isSingleEpisodeGroup = !isRating && uniqueEpisodeRows.length === 1;
                const singleEpRow = !isRating && uniqueEpisodeRows.length === 1 ? uniqueEpisodeRows[0] : null;

                const myRating = isRating ? myRatingMapObj[ratingItem!.movieId] : undefined;
                const userHasRatedMovie = isRating && ratingItem!.movieId in myRatingMapObj;
                const userHasWatchedShow =
                  !isRating &&
                  myWatchedShowKeys.has(groupItem!.showTitle.toLowerCase().trim());

                return (
                  <div
                    key={idx}
                    onClick={() => handleCoverClick(item)}
                    className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col lg:flex-row ${
                      isRating
                        ? "border-white/[0.06] hover:border-amber-400/30 hover:shadow-[0_12px_40px_rgba(245,158,11,0.08)]"
                        : "border-white/[0.06] hover:border-teal-400/30 hover:shadow-[0_12px_40px_rgba(45,212,191,0.08)]"
                    }`}
                  >
                    {/* Cover — top on mobile, left on desktop */}
                    <div className="relative w-full lg:w-44 xl:w-52 shrink-0 aspect-[16/9] lg:aspect-auto lg:self-stretch lg:min-h-[180px] xl:min-h-[200px] bg-zinc-950 overflow-hidden">
                      {cardImageUrl ? (
                        <ImageWithLoader
                          src={cardImageUrl}
                          alt={isRating ? (movieTitle ?? "Movie") : groupItem!.showTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          wrapperClassName="absolute inset-0 w-full h-full"
                          loaderSize={10}
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                          {isRating ? (
                            <Film className="w-10 h-10 text-zinc-700" />
                          ) : (
                            <Tv className="w-10 h-10 text-zinc-700" />
                          )}
                        </div>
                      )}

                      {/* Mobile overlay: title + rating on top of image */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent lg:hidden" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 lg:hidden">
                        <h3 className="text-lg sm:text-xl font-black text-white font-['Space_Grotesk'] tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
                          {isRating ? (movieTitle ?? `Movie #${ratingItem!.movieId}`) : groupItem!.showTitle}
                        </h3>
                      </div>

                      {/* Mobile floating rating badge */}
                      {isRating && ratingItem!.rating && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-amber-400/25 shadow-[0_0_20px_rgba(245,158,11,0.2)] lg:hidden">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-black text-white tabular-nums">{ratingItem!.rating}</span>
                          <span className="text-[10px] font-medium text-amber-400/60">/10</span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-4 lg:p-5 bg-zinc-950/80 flex flex-col justify-between min-w-0 gap-3">
                      {/* Top: User row + timestamp */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isRating ? (
                            <Link
                              href={`/users/${ratingItem!.user.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 group/avatar"
                            >
                              <UserAvatar
                                image={ratingItem!.user.image}
                                name={ratingItem!.user.name}
                                sizeClassName="w-8 h-8 ring-2 ring-amber-500/20 group-hover/avatar:ring-amber-400 transition-all"
                                textClassName="text-[10px]"
                              />
                            </Link>
                          ) : (
                            <div className="flex -space-x-2 overflow-hidden shrink-0">
                              {(groupItem!.users || []).map((u) => (
                                <Link
                                  key={u.id}
                                  href={`/users/${u.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  title={u.name ?? "Member"}
                                >
                                  <UserAvatar
                                    image={u.image}
                                    name={u.name}
                                    sizeClassName="w-8 h-8 ring-2 ring-zinc-950"
                                    textClassName="text-[10px]"
                                  />
                                </Link>
                              ))}
                            </div>
                          )}

                          <div className="text-[13px] text-zinc-300 min-w-0 truncate leading-snug">
                            {isRating ? (
                              <>
                                <Link
                                  href={`/users/${ratingItem!.user.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-bold text-white hover:text-amber-400 transition-colors"
                                >
                                  {ratingItem!.user.name ?? "Movix Member"}
                                </Link>{" "}
                                <span className="text-zinc-500">rated this</span>
                              </>
                            ) : (
                              <>
                                {(groupItem!.users || []).map((u, index) => (
                                  <span key={u.id}>
                                    <Link
                                      href={`/users/${u.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="font-bold text-white hover:text-teal-300 transition-colors"
                                    >
                                      {u.name ?? "Movix Member"}
                                    </Link>
                                    {index < (groupItem!.users || []).length - 1 && ", "}
                                  </span>
                                ))}{" "}
                                <span className="text-zinc-500">
                                  watched {uniqueEpisodeRows.length === 1 ? "this" : `${uniqueEpisodeRows.length} episodes`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] font-medium text-zinc-600 shrink-0">
                          {formatTimeAgo(isRating ? ratingItem!.timestamp : groupItem!.latestTimestamp)}
                        </span>
                      </div>

                      {/* Desktop: Title + Rating (hidden on mobile where it's overlaid on image) */}
                      <div className="hidden lg:flex items-center justify-between gap-3">
                        <h3 className="text-lg xl:text-xl font-black text-white font-['Space_Grotesk'] tracking-tight leading-tight group-hover:text-yellow-300 transition-colors duration-300 line-clamp-2 flex-1 min-w-0">
                          {isRating ? (movieTitle ?? `Movie #${ratingItem!.movieId}`) : groupItem!.showTitle}
                        </h3>

                        {isRating && ratingItem!.rating && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 shrink-0">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-black text-white tabular-nums">{ratingItem!.rating}</span>
                            <span className="text-[10px] font-medium text-amber-400/60">/10</span>
                          </div>
                        )}
                      </div>

                      {/* Episode info */}
                      {!isRating && isSingleEpisodeGroup && singleEpRow && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-400/30 whitespace-nowrap">
                            S{singleEpRow.seasonNumber.toString().padStart(2, "0")} · E
                            {singleEpRow.episodeNumber.toString().padStart(2, "0")}
                          </span>
                          {singleEpRow.episodeName && (
                            <span className="text-zinc-400 font-medium text-xs truncate max-w-[240px] italic">
                              &quot;{singleEpRow.episodeName}&quot;
                            </span>
                          )}
                        </div>
                      )}

                      {/* Grouped Episodes List */}
                      {!isRating && !isSingleEpisodeGroup && (
                        <div className="space-y-1 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          {uniqueEpisodeRows.map((row, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-0.5 gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="inline-flex items-center gap-1 font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-400/25 whitespace-nowrap shrink-0">
                                  S{row.seasonNumber.toString().padStart(2, "0")} · E
                                  {row.episodeNumber.toString().padStart(2, "0")}
                                </span>
                                {row.episodeName && (
                                  <span className="text-zinc-400 truncate text-[12px] min-w-0 flex-1">
                                    {row.episodeName}
                                  </span>
                                )}
                              </div>
                              {row.users.length > 0 && (
                                <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                  {row.users.map((u) => (
                                    <Link
                                      key={u.id}
                                      href={`/users/${u.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      title={u.name ?? "Member"}
                                    >
                                      <UserAvatar
                                        image={u.image}
                                        name={u.name}
                                        sizeClassName="w-4 h-4 ring-1 ring-zinc-950"
                                        textClassName="text-[7px]"
                                      />
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Personal badge — always visible */}
                      {(userHasRatedMovie || userHasWatchedShow) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                          {userHasRatedMovie && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                              <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                              <span>You rated {myRating || "—"}<span className="text-emerald-500/60">/10</span></span>
                            </div>
                          )}
                          {userHasWatchedShow && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 text-teal-400" />
                              <span>You watched this</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Movie Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        userLibrary={userLibrary}
        onLibraryUpdate={fetchUserLibrary}
      />

      {/* TV Show Modal */}
      <TvShowModal
        showId={selectedTvShowId}
        isOpen={!!selectedTvShowId}
        onClose={() => setSelectedTvShowId(null)}
        onLibraryUpdate={fetchUserLibrary}
      />
    </>
  );
}