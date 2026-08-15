"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";

export type PersonCredit = {
  id: number;
  title: string;
  media_type: "movie" | "tv";
  character: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  overview: string;
  episode_count?: number | null;
};

import { TrophyShowcase } from "@/components/common/TrophyShowcase";
import { AwardsSummary } from "@/lib/awards";

export type PersonDetails = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  gender: number;
  popularity: number;
  imdb_id: string | null;
  also_known_as: string[];
  homepage: string | null;
  photos: string[];
  awards?: AwardsSummary;
  credits: {
    cast: PersonCredit[];
  };
};

interface ActorModalProps {
  personId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie?: (movie: any) => void;
  onSelectTvShow?: (showId: number | string) => void;
}

export function ActorModal({
  personId,
  isOpen,
  onClose,
  onSelectMovie,
  onSelectTvShow,
}: ActorModalProps) {
  const [data, setData] = useState<PersonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "movie" | "tv">("all");
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (personId && isOpen) {
      setIsLoading(true);
      setIsBioExpanded(false);
      setActiveTab("all");

      fetch(`/api/person/${personId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch person details");
          return res.json();
        })
        .then((personData: PersonDetails) => {
          setData(personData);
        })
        .catch((err) => {
          console.error("[ACTOR_MODAL_FETCH_ERROR]", err);
          setData(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
    }
  }, [personId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const castCredits = data?.credits?.cast || [];

  const filteredCredits = useMemo(() => {
    if (activeTab === "all") return castCredits;
    return castCredits.filter((c) => c.media_type === activeTab);
  }, [castCredits, activeTab]);

  const movieCount = useMemo(
    () => castCredits.filter((c) => c.media_type === "movie").length,
    [castCredits]
  );
  const tvCount = useMemo(
    () => castCredits.filter((c) => c.media_type === "tv").length,
    [castCredits]
  );

  const calculateAge = (birthday: string, deathday: string | null) => {
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const m = endDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleMediaClick = (credit: PersonCredit) => {
    if (credit.media_type === "tv") {
      if (onSelectTvShow) {
        onSelectTvShow(credit.id);
      }
    } else {
      if (onSelectMovie) {
        onSelectMovie({
          id: credit.id,
          title: credit.title,
          poster_path: credit.poster_path,
          backdrop_path: credit.backdrop_path,
          release_date: credit.release_date,
          vote_average: credit.vote_average,
          vote_count: credit.vote_count,
          overview: credit.overview,
        });
      }
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  const heroImage = data?.profile_path
    ? `https://image.tmdb.org/t/p/original${data.profile_path}`
    : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center md:p-8 overscroll-none">
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
            className="glass-panel relative z-10 flex h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col overflow-hidden rounded-none md:rounded-[2rem] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.8)] bg-zinc-950"
          >
            {/* Top Navigation Buttons */}
            {/* Arrow Back Button */}
            <button
              onClick={onClose}
              className="fixed md:absolute left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white transition hover:bg-black/80 hover:scale-105 active:scale-95 touch-manipulation"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
              aria-label="Go back"
              title="Back"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="fixed md:absolute right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white transition hover:bg-black/80 hover:scale-105 active:scale-95 touch-manipulation"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
              aria-label="Close modal"
              title="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {isLoading ? (
              <div className="flex-1 overflow-y-auto md:overflow-hidden h-full flex flex-col md:flex-row animate-pulse">
                {/* Left Column Skeleton */}
                <div className="relative w-full shrink-0 overflow-hidden h-[380px] sm:h-[440px] md:h-full md:w-[42%] lg:w-[40%] bg-zinc-900/90 flex flex-col justify-end p-6">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950" />
                  <div className="relative z-10 space-y-2.5 md:hidden">
                    <div className="h-6 w-24 rounded-full bg-zinc-800" />
                    <div className="h-8 w-48 rounded-xl bg-zinc-800" />
                    <div className="h-4 w-32 rounded-md bg-zinc-800/80" />
                  </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="flex-1 overflow-visible md:overflow-y-auto p-5 pb-24 md:p-8 md:pb-10 md:pt-8 overscroll-none space-y-6">
                  {/* Desktop Header Skeleton */}
                  <div className="hidden md:block space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-24 rounded-full bg-zinc-800" />
                      <div className="h-6 w-32 rounded-full bg-zinc-800/60" />
                    </div>
                    <div className="h-10 w-64 rounded-2xl bg-zinc-800" />
                    <div className="h-4 w-48 rounded-md bg-zinc-800/70" />
                  </div>

                  {/* Accolades Skeleton */}
                  <div className="rounded-2xl bg-zinc-900/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-16 rounded bg-amber-400/20" />
                        <div className="h-4 w-24 rounded bg-zinc-800" />
                      </div>
                      <div className="h-5 w-16 rounded-full bg-zinc-800/60" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-32 rounded-xl bg-zinc-800/60" />
                      <div className="h-6 w-24 rounded-xl bg-zinc-800/60" />
                    </div>
                  </div>

                  {/* Stat Highlights Skeleton */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="h-20 rounded-2xl bg-white/[0.03] p-4 space-y-2">
                      <div className="h-2.5 w-16 bg-zinc-800 rounded" />
                      <div className="h-5 w-12 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-20 rounded-2xl bg-white/[0.03] p-4 space-y-2">
                      <div className="h-2.5 w-16 bg-zinc-800 rounded" />
                      <div className="h-5 w-16 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-20 rounded-2xl bg-white/[0.03] p-4 space-y-2 col-span-2 sm:col-span-1">
                      <div className="h-2.5 w-20 bg-zinc-800 rounded" />
                      <div className="h-5 w-14 bg-zinc-800 rounded" />
                    </div>
                  </div>

                  {/* Biography Skeleton */}
                  <div className="space-y-2.5 rounded-2xl bg-white/[0.02] p-5">
                    <div className="h-5 w-28 bg-zinc-800 rounded-md" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-full bg-zinc-800/80 rounded" />
                      <div className="h-3.5 w-[92%] bg-zinc-800/80 rounded" />
                      <div className="h-3.5 w-[75%] bg-zinc-800/80 rounded" />
                    </div>
                  </div>

                  {/* Filmography Section Skeleton */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-36 bg-zinc-800 rounded-lg" />
                      <div className="h-7 w-44 bg-zinc-800/60 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-900 overflow-hidden" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : !data ? (
              <div className="flex h-[350px] w-full flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-zinc-600">person_off</span>
                <p className="text-base text-zinc-400">Could not find information for this person.</p>
                <button
                  onClick={onClose}
                  className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto md:overflow-hidden h-full flex flex-col md:flex-row">
                {/* Left Column: Huge borderless actor image */}
                <div className="relative w-full shrink-0 overflow-hidden h-[380px] sm:h-[440px] md:h-auto md:w-[42%] lg:w-[40%] flex flex-col justify-end">
                  {heroImage ? (
                    <ImageWithLoader
                      src={heroImage}
                      alt={data.name}
                      className="absolute inset-0 h-full w-full object-cover object-center md:object-top"
                      loaderSize={60}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <span className="material-symbols-outlined text-8xl text-zinc-700">person</span>
                    </div>
                  )}

                  {/* Seamless cinematic gradient blends without any borders */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent md:bg-gradient-to-r md:from-transparent md:via-zinc-950/30 md:to-zinc-950" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,204,0,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(87,27,193,0.3),transparent_50%)] pointer-events-none" />

                  {/* Mobile-only info overlay at bottom of hero */}
                  <div className="relative z-10 p-6 md:hidden">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/15 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-300">
                        {data.known_for_department || "Actor"}
                      </span>
                      {data.awards?.hasAwards && (
                        <TrophyShowcase awards={data.awards} variant="badge-only" />
                      )}
                      {data.imdb_id && (
                        <a
                          href={`https://www.imdb.com/name/${data.imdb_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white"
                        >
                          <span>IMDb</span>
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                    <h2 className="font-headline-lg text-3xl font-extrabold text-white drop-shadow-md">
                      {data.name}
                    </h2>
                    <p className="mt-1 text-sm text-[#ffedc3]">
                      {data.birthday && `${calculateAge(data.birthday, data.deathday)} yrs`}
                      {data.place_of_birth && ` • ${data.place_of_birth}`}
                    </p>
                  </div>
                </div>

                {/* Right Column: Scrollable content & filmography */}
                <div className="flex-1 overflow-visible md:overflow-y-auto p-5 pb-24 md:p-8 md:pb-10 md:pt-8 overscroll-none space-y-6">
                  {/* Desktop Header */}
                  <header className="hidden md:block space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-label-sm uppercase tracking-[0.24em] font-bold text-yellow-300">
                        {data.known_for_department || "Actor"}
                      </span>
                      <span className="text-label-sm uppercase tracking-[0.24em] text-zinc-500 font-semibold">
                        TMDB Spotlight
                      </span>
                      {data.awards?.hasAwards && (
                        <TrophyShowcase awards={data.awards} variant="badge-only" />
                      )}
                      {data.imdb_id && (
                        <a
                          href={`https://www.imdb.com/name/${data.imdb_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                          <span>IMDb Profile</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      )}
                    </div>

                    <h2 className="font-display-xl text-4xl lg:text-5xl font-extrabold leading-none tracking-[-0.03em] text-white">
                      {data.name}
                    </h2>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                      {data.birthday && (
                        <span>
                          {data.deathday ? `Born: ${data.birthday}` : `Age: ${calculateAge(data.birthday, null)} (${data.birthday})`}
                        </span>
                      )}
                      {data.deathday && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <span>Died: {data.deathday} (aged {calculateAge(data.birthday || '', data.deathday)})</span>
                        </>
                      )}
                      {data.place_of_birth && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <span className="truncate max-w-xs">{data.place_of_birth}</span>
                        </>
                      )}
                    </div>
                  </header>

                  {/* Modern Borderless Smart Trophy Showcase */}
                  {data.awards?.hasAwards && (
                    <TrophyShowcase awards={data.awards} />
                  )}

                  {/* Stat Highlights Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        Known Credits
                      </span>
                      <span className="text-xl font-bold text-white mt-0.5">
                        {castCredits.length} <span className="text-xs font-normal text-zinc-400">titles</span>
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        Department
                      </span>
                      <span className="text-xl font-bold text-yellow-300 mt-0.5">
                        {data.known_for_department || "Acting"}
                      </span>
                    </div>

                    {data.popularity > 0 && (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex flex-col justify-center col-span-2 sm:col-span-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                          TMDB Popularity
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-[18px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                            trending_up
                          </span>
                          <span className="text-xl font-bold text-white">
                            {data.popularity.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Biography Section */}
                  {data.biography ? (
                    <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 md:p-5">
                      <h3 className="font-headline-md text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-yellow-400">subject</span>
                        Biography
                      </h3>
                      <div
                        className={`text-sm leading-relaxed text-zinc-300 transition-all ${
                          !isBioExpanded && data.biography.length > 350
                            ? "line-clamp-4"
                            : ""
                        }`}
                      >
                        {data.biography}
                      </div>
                      {data.biography.length > 350 && (
                        <button
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-400 hover:text-yellow-300 pt-1 transition-colors"
                        >
                          <span>{isBioExpanded ? "Show less" : "Read full biography"}</span>
                          <span className="material-symbols-outlined text-[14px]">
                            {isBioExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : null}

                  {/* Photo Gallery Strip */}
                  {data.photos && data.photos.length > 1 && (
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-yellow-400">photo_library</span>
                        Photos
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                        {data.photos.map((photoPath, idx) => (
                          <div
                            key={idx}
                            className="shrink-0 w-24 h-36 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shadow-md group"
                          >
                            <ImageWithLoader
                              src={`https://image.tmdb.org/t/p/w185${photoPath}`}
                              alt={`${data.name} photo ${idx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                              loaderSize={20}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filmography Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <h3 className="font-headline-md text-xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[22px] text-yellow-400">movie</span>
                        Filmography
                      </h3>

                      {/* Filter Tabs */}
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
                        <button
                          onClick={() => setActiveTab("all")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === "all"
                              ? "bg-yellow-400 text-black shadow-md"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          All ({castCredits.length})
                        </button>
                        <button
                          onClick={() => setActiveTab("movie")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === "movie"
                              ? "bg-yellow-400 text-black shadow-md"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Movies ({movieCount})
                        </button>
                        <button
                          onClick={() => setActiveTab("tv")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === "tv"
                              ? "bg-yellow-400 text-black shadow-md"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          TV Shows ({tvCount})
                        </button>
                      </div>
                    </div>

                    {filteredCredits.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-sm">
                        No titles found for this filter.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                        {filteredCredits.slice(0, 36).map((item) => {
                          const poster = item.poster_path
                            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                            : item.backdrop_path
                            ? `https://image.tmdb.org/t/p/w300${item.backdrop_path}`
                            : null;
                          const year = item.release_date
                            ? item.release_date.split("-")[0]
                            : "";

                          return (
                            <div
                              key={`${item.media_type}-${item.id}`}
                              onClick={() => handleMediaClick(item)}
                              className="group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-yellow-400/50 hover:bg-white/[0.07] transition-all cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1 touch-manipulation"
                            >
                              {/* Card Poster */}
                              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
                                {poster ? (
                                  <ImageWithLoader
                                    src={poster}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loaderSize={30}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-600">
                                    <span className="material-symbols-outlined text-4xl">
                                      {item.media_type === "tv" ? "tv" : "movie"}
                                    </span>
                                  </div>
                                )}

                                {/* Media Type & Rating Badges */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                                  <span className="rounded-md bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-300 border border-white/10">
                                    {item.media_type === "tv" ? "TV" : "Movie"}
                                  </span>
                                </div>

                                {item.vote_average > 0 && (
                                  <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 border border-white/10">
                                    <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                      star
                                    </span>
                                    {item.vote_average.toFixed(1)}
                                  </div>
                                )}
                              </div>

                              {/* Card Content */}
                              <div className="p-2.5 flex flex-col justify-between flex-1">
                                <div>
                                  <h4 className="text-xs font-bold text-white group-hover:text-yellow-300 transition-colors line-clamp-1">
                                    {item.title}
                                  </h4>
                                  {item.character && (
                                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                                      as {item.character}
                                    </p>
                                  )}
                                </div>
                                {year && (
                                  <span className="text-[10px] text-zinc-500 font-medium mt-1">
                                    {year}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
