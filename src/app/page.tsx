"use client";

import {useEffect, useState} from "react";

type Movie = {
    id: number;
    title: string;
    poster_path: string;
    overview: string;
    release_date: string;
    vote_average: number;
    vote_count: number;
};

type ApiResponse = {
    page: number;
    results: Movie[];
    total_pages: number;
    total_results: number;
};

// Helper to calculate "days ago"
function daysAgo(dateString: string): string {
    if (!dateString) return "";
    const release = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - release.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
}

export default function Home() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    // Track which descriptions are open
    const [openDesc, setOpenDesc] = useState<{ [id: number]: boolean }>({});

    useEffect(() => {
        fetch(`/api/trending?page=${page}`)
            .then((res) => res.json())
            .then((data: ApiResponse) => {
                setMovies(data.results);
                setTotalPages(data.total_pages);
                setOpenDesc({}); // Reset open descriptions on page change
            });
    }, [page]);

    const toggleDesc = (id: number) => {
        setOpenDesc((prev) => ({...prev, [id]: !prev[id]}));
    };

    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold mb-6">Trending Movies</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {movies.map((movie) => (
                    <div
                        key={movie.id}
                        className="bg-gray-800 rounded p-4 flex flex-col relative"
                    >
                        {movie.poster_path && (
                            <img
                                src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                                alt={movie.title}
                                className="rounded mb-2"
                            />
                        )}
                        {/* Rating Circle */}
                        <div className="absolute top-4 right-4">
                            <div
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400 shadow-lg">
                <span className="text-lg font-bold text-gray-900">
                  {movie.vote_average.toFixed(1)}
                </span>
                            </div>
                        </div>
                        <h2 className="text-lg font-semibold mb-1 mt-2">{movie.title}</h2>
                        <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                         <span
                             className="inline-block bg-yellow-400 text-gray-900 font-bold text-xs px-2 py-0.5 rounded-full shadow ml-1"
                             title={movie.release_date}
                         >
                            {daysAgo(movie.release_date)}
                        </span>
                        </p>
                        {/* Toggle Button */}
                        <button
                            className="flex items-center gap-1 text-yellow-400 mt-2 mb-1 focus:outline-none cursor-pointer"
                            onClick={() => toggleDesc(movie.id)}
                            aria-label={
                                openDesc[movie.id] ? "Hide description" : "Show description"
                            }
                        >
                            <span>Description</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${
                                    openDesc[movie.id] ? "rotate-90" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                        {/* Description */}
                        {openDesc[movie.id] && (
                            <p className="text-xs text-gray-300 mt-2">{movie.overview}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-8">
                <button
                    className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Previous
                </button>
                <span className="text-lg font-semibold">
          Page {page} of {totalPages}
        </span>
                <button
                    className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Next
                </button>
            </div>
        </main>
    );
}
