import { NextRequest, NextResponse } from "next/server";

const GENRE_MAP: { [key: string]: number[] } = {
  "Action": [28, 10759],
  "Animation": [16],
  "Comedy": [35],
  "Drama": [18],
  "Sci-Fi / Fantasy": [878, 14, 10765],
  "Thriller / Mystery": [53, 9648],
  "Romance": [10749]
};

const belongsToDecades = (year: number, activeDecades: string[]) => {
  return activeDecades.some(decade => {
    if (decade === "2020s") return year >= 2020;
    if (decade === "2010s") return year >= 2010 && year < 2020;
    if (decade === "2000s") return year >= 2000 && year < 2010;
    if (decade === "90s") return year >= 1990 && year < 2000;
    if (decade === "80s") return year >= 1980 && year < 1990;
    if (decade === "70s & older") return year < 1980;
    return false;
  });
};

export async function GET(req: NextRequest) {
    try {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            return new NextResponse('TMDB API Key missing', { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const genresParam = searchParams.get("genres");
        const decadesParam = searchParams.get("decades");

        const activeGenres = genresParam ? genresParam.split(",").filter(Boolean) : [];
        const activeDecades = decadesParam ? decadesParam.split(",").filter(Boolean) : [];

        const isGenreFiltered = activeGenres.length > 0 && !activeGenres.includes("All Genres");
        const isDecadeFiltered = activeDecades.length > 0 && !activeDecades.includes("All Decades");

        // 1. If no filters are active, use default curated top-rated lists
        if (!isGenreFiltered && !isDecadeFiltered) {
            const movieUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=${page}`;
            const tvUrl = `https://api.themoviedb.org/3/tv/top_rated?api_key=${apiKey}&page=${page}`;

            const [movieRes, tvRes] = await Promise.all([
                fetch(movieUrl, { next: { revalidate: 3600 } }),
                fetch(tvUrl, { next: { revalidate: 3600 } })
            ]);

            if (!movieRes.ok || !tvRes.ok) {
                return new NextResponse('Error fetching from TMDB', { status: 502 });
            }

            const movieData = await movieRes.json();
            const tvData = await tvRes.json();

            const movies = (movieData.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
            const tvShows = (tvData.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));

            const results = [...movies, ...tvShows].sort((a, b) => b.vote_average - a.vote_average);

            return NextResponse.json({
                page: parseInt(page, 10),
                results,
                total_pages: Math.min(movieData.total_pages || 0, tvData.total_pages || 0),
                total_results: (movieData.total_results || 0) + (tvData.total_results || 0)
            });
        }

        // 2. If filters are active, use the discover endpoint
        let genreIds: number[] = [];
        if (isGenreFiltered) {
            activeGenres.forEach(genre => {
                const ids = GENRE_MAP[genre];
                if (ids) genreIds.push(...ids);
            });
        }

        let minDate = "";
        let maxDate = "";
        if (isDecadeFiltered) {
            let lowestYear = 9999;
            let highestYear = 0;
            
            activeDecades.forEach(decade => {
                if (decade === "2020s") {
                    lowestYear = Math.min(lowestYear, 2020);
                    highestYear = Math.max(highestYear, 2099);
                } else if (decade === "2010s") {
                    lowestYear = Math.min(lowestYear, 2010);
                    highestYear = Math.max(highestYear, 2019);
                } else if (decade === "2000s") {
                    lowestYear = Math.min(lowestYear, 2000);
                    highestYear = Math.max(highestYear, 2009);
                } else if (decade === "90s") {
                    lowestYear = Math.min(lowestYear, 1990);
                    highestYear = Math.max(highestYear, 1999);
                } else if (decade === "80s") {
                    lowestYear = Math.min(lowestYear, 1980);
                    highestYear = Math.max(highestYear, 1989);
                } else if (decade === "70s & older") {
                    lowestYear = Math.min(lowestYear, 1800);
                    highestYear = Math.max(highestYear, 1979);
                }
            });
            
            minDate = `${lowestYear}-01-01`;
            maxDate = `${highestYear}-12-31`;
        }

        let movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=vote_average.desc&vote_count.gte=200&page=${page}`;
        let tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&sort_by=vote_average.desc&vote_count.gte=50&page=${page}`;

        if (genreIds.length > 0) {
            const genresQuery = `&with_genres=${genreIds.join("|")}`;
            movieUrl += genresQuery;
            tvUrl += genresQuery;
        }

        if (minDate) {
            movieUrl += `&primary_release_date.gte=${minDate}`;
            tvUrl += `&first_air_date.gte=${minDate}`;
        }
        if (maxDate) {
            movieUrl += `&primary_release_date.lte=${maxDate}`;
            tvUrl += `&first_air_date.lte=${maxDate}`;
        }

        const [movieRes, tvRes] = await Promise.all([
            fetch(movieUrl, { next: { revalidate: 3600 } }),
            fetch(tvUrl, { next: { revalidate: 3600 } })
        ]);

        if (!movieRes.ok || !tvRes.ok) {
            return new NextResponse('Error discovering from TMDB', { status: 502 });
        }

        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        const movies = (movieData.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
        const tvShows = (tvData.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));

        let results = [...movies, ...tvShows];

        // If decade is filtered and multiple decades were requested, discard gap results server-side
        if (isDecadeFiltered) {
            results = results.filter((movie: any) => {
                const dateStr = movie.release_date || movie.first_air_date;
                if (!dateStr) return false;
                const year = new Date(dateStr).getFullYear();
                if (isNaN(year)) return false;
                return belongsToDecades(year, activeDecades);
            });
        }

        results.sort((a, b) => b.vote_average - a.vote_average);

        return NextResponse.json({
            page: parseInt(page, 10),
            results,
            total_pages: Math.min(movieData.total_pages || 0, tvData.total_pages || 0),
            total_results: (movieData.total_results || 0) + (tvData.total_results || 0)
        });
    } catch (error) {
        console.error('[TOP_RATED_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
