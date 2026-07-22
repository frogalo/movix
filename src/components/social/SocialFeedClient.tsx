"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";
import { MovieModal } from "@/components/movie/MovieModal";
import { TvShowModal } from "@/components/tv/TvShowModal";

export interface EpisodeDetail {
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string | null;
  timestamp: string;
  user: { id: string; name: string | null; image: string | null };
}

export interface FeedRatingItem {
  type: "rating";
  user: { id: string; name: string | null; image: string | null };
  movieId: number;
  rating: number | null;
  vote: string | null;
  timestamp: string;
  posterUrl?: string | null;
  movieTitle?: string | null;
}

export interface FeedEpisodeGroupItem {
  type: "episode_group";
  user?: { id: string; name: string | null; image: string | null };
  showTitle: string;
  showPosterPath: string | null;
  showTmdbId: number | null;
  episodes: EpisodeDetail[];
  latestTimestamp: string;
  users: Array<{ id: string; name: string | null; image: string | null }>;
  posterUrl?: string | null;
}

export type FeedGroupedItem = FeedRatingItem | FeedEpisodeGroupItem;

export interface DayGroup {
  dayLabel: string;
  items: FeedGroupedItem[];
}

interface SocialFeedClientProps {
  groupedByDay: DayGroup[];
  myRatingMapObj: Record<number, number | null>;
  myWatchedShowKeysArr: string[];
}

function formatUsersHeader(users: Array<{ id: string; name: string | null }>): string {
  const names = users.map((u) => u.name ?? "Movix Member");
  return names.join(", ");
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
    } catch {}
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
        } catch {}
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
          <div key={dayIdx} className="space-y-3">
            {/* Horizontal Day Separator */}
            <div className="flex items-center gap-4 pt-2 pb-1">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/90 font-mono">
                {dayGroup.dayLabel}
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-400/30 via-white/10 to-transparent" />
            </div>

            {/* Feed Items for this day */}
            <div className="space-y-3">
              {dayGroup.items.map((item, idx) => {
                const isRating = item.type === "rating";
                const posterUrl = item.posterUrl;
                const movieTitle = isRating ? item.movieTitle : null;
                const ratingItem = isRating ? item : null;
                const groupItem = !isRating ? item : null;

                const uniqueEpKeys = !isRating
                  ? new Set(groupItem!.episodes.map((e) => `${e.seasonNumber}-${e.episodeNumber}`))
                  : new Set();

                const isSingleEpisodeGroup = !isRating && uniqueEpKeys.size === 1;
                const singleEp = !isRating ? groupItem!.episodes[0] : null;

                const sortedEpisodes = !isRating
                  ? [...groupItem!.episodes].sort(
                      (a, b) =>
                        a.seasonNumber - b.seasonNumber ||
                        a.episodeNumber - b.episodeNumber ||
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                  : [];

                const myRating = isRating ? myRatingMapObj[ratingItem!.movieId] : undefined;
                const userHasRatedMovie = isRating && ratingItem!.movieId in myRatingMapObj;
                const userHasWatchedShow =
                  !isRating &&
                  myWatchedShowKeys.has(groupItem!.showTitle.toLowerCase().trim());

                return (
                  <div
                    key={idx}
                    className={`flex items-stretch overflow-hidden rounded-2xl glass-panel border border-white/5 transition-all group ${
                      isRating
                        ? "hover:border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                        : "hover:border-teal-400/40 shadow-[0_0_20px_rgba(45,212,191,0.1)]"
                    }`}
                  >
                    {/* Cover / Poster - Clickable to open Movie or TV modal */}
                    <div
                      onClick={() => handleCoverClick(item)}
                      className="w-24 sm:w-32 shrink-0 relative self-stretch bg-zinc-950 border-r border-white/10 overflow-hidden cursor-pointer group/cover"
                      title={`Click to view ${isRating ? movieTitle || "movie" : groupItem!.showTitle} details`}
                    >
                      {posterUrl ? (
                        <ImageWithLoader
                          src={posterUrl}
                          alt={isRating ? (movieTitle ?? "Movie") : groupItem!.showTitle}
                          className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500"
                          wrapperClassName="w-full h-full"
                          loaderSize={10}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                          <span className="material-symbols-outlined text-zinc-600 text-3xl">
                            {isRating ? "movie" : "live_tv"}
                          </span>
                        </div>
                      )}

                      {/* Hover Overlay Hint */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">
                          visibility
                        </span>
                      </div>
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div>
                        {/* User Sub-Header */}
                        <div className="flex items-center gap-2 mb-1.5">
                          {isRating ? (
                            <Link href={`/users/${ratingItem!.user.id}`} className="shrink-0">
                              <UserAvatar
                                image={ratingItem!.user.image}
                                name={ratingItem!.user.name}
                                sizeClassName="w-6 h-6"
                                textClassName="text-[9px]"
                              />
                            </Link>
                          ) : (
                            <div className="flex -space-x-2 overflow-hidden shrink-0">
                              {groupItem!.users.map((u) => (
                                <Link key={u.id} href={`/users/${u.id}`} title={u.name ?? "Member"}>
                                  <UserAvatar
                                    image={u.image}
                                    name={u.name}
                                    sizeClassName="w-6 h-6 border border-zinc-900"
                                    textClassName="text-[9px]"
                                  />
                                </Link>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-zinc-400 truncate">
                            {isRating ? (
                              <Link
                                href={`/users/${ratingItem!.user.id}`}
                                className="font-bold text-white hover:text-yellow-400 hover:underline transition-colors"
                              >
                                {ratingItem!.user.name ?? "Movix Member"}
                              </Link>
                            ) : (
                              groupItem!.users.map((u, index) => (
                                <span key={u.id}>
                                  <Link
                                    href={`/users/${u.id}`}
                                    className="font-bold text-white hover:text-teal-300 hover:underline transition-colors"
                                  >
                                    {u.name ?? "Movix Member"}
                                  </Link>
                                  {index < groupItem!.users.length - 1 && ", "}
                                </span>
                              ))
                            )}
                          </p>
                        </div>

                        {/* Title & Aligned Rating Row */}
                        <div className="flex items-center justify-between gap-3 my-1">
                          <h3
                            onClick={() => handleCoverClick(item)}
                            className="text-base font-bold text-white hover:text-yellow-400 transition-colors truncate cursor-pointer"
                          >
                            {isRating ? (movieTitle ?? `Movie #${ratingItem!.movieId}`) : groupItem!.showTitle}
                          </h3>

                          {isRating && ratingItem!.rating && (
                            <div className="inline-flex items-center gap-1 text-yellow-400 font-extrabold text-xs bg-yellow-500/10 px-2.5 py-1 rounded-xl border border-yellow-500/25 shadow-[0_0_12px_rgba(255,204,0,0.15)] shrink-0">
                              <span
                                className="material-symbols-outlined text-[13px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                              <span>{ratingItem!.rating}/10</span>
                            </div>
                          )}
                        </div>

                        {/* Season & Episode POP Badge for Single Episode */}
                        {!isRating && isSingleEpisodeGroup && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-[0_0_12px_rgba(45,212,191,0.2)]">
                              S{singleEp!.seasonNumber.toString().padStart(2, "0")} · E
                              {singleEp!.episodeNumber.toString().padStart(2, "0")}
                            </span>
                            {singleEp!.episodeName && (
                              <span className="hidden sm:inline text-zinc-300 font-medium text-xs truncate">
                                {singleEp!.episodeName}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Grouped Episodes List for Binge Watching */}
                        {!isRating && !isSingleEpisodeGroup && (
                          <div className="mt-2.5 space-y-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                            {sortedEpisodes.map((ep, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="inline-flex items-center gap-1 font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-400/30">
                                    S{ep.seasonNumber.toString().padStart(2, "0")} · E
                                    {ep.episodeNumber.toString().padStart(2, "0")}
                                  </span>
                                  {ep.episodeName && (
                                    <span className="hidden sm:inline text-zinc-300 truncate text-[12px]">
                                      {ep.episodeName}
                                    </span>
                                  )}
                                </div>
                                {groupItem!.users.length > 1 && (
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <span className="text-[11px] text-zinc-400 font-medium">
                                      {ep.user.name ?? "Member"}
                                    </span>
                                    <UserAvatar
                                      image={ep.user.image}
                                      name={ep.user.name}
                                      sizeClassName="w-4 h-4"
                                      textClassName="text-[8px]"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Logged-in User Interaction Badge ("You also rated/watched this") */}
                      {(userHasRatedMovie || userHasWatchedShow) && (
                        <div className="mt-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                            <span
                              className="material-symbols-outlined text-[13px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {isRating ? "star" : "check_circle"}
                            </span>
                            {isRating
                              ? `You rated this  ${myRating ? `${myRating}/10` : ""}`
                              : "You watched this"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Vertical Colored Accent Bar with Vertical Action Label */}
                    <div
                      className={`w-9 shrink-0 flex items-center justify-center border-l select-none transition-colors ${
                        isRating
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20"
                          : "bg-teal-500/10 border-teal-500/20 text-teal-400 group-hover:bg-teal-500/20"
                      }`}
                    >
                      <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black uppercase tracking-[0.25em]">
                        {isRating ? "RATED" : "WATCHED"}
                      </span>
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