import { TMDB_BASE_URL } from '@/lib/config';
import { NextRequest, NextResponse } from "next/server";
import { getPopularGames } from "@/lib/igdb";

export async function GET(req: NextRequest) {
    const apiKey = process.env.TMDB_API_KEY;
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const url = `${TMDB_BASE_URL}/trending/all/week?api_key=${apiKey}&page=${page}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        let tmdbResults = [];
        if (data.results && Array.isArray(data.results)) {
            tmdbResults = data.results.filter((item: any) => item.media_type !== 'person');
        }

        // Fetch popular games if on page 1, 2, or 4
        let gameResults = [];
        if (page === "1" || page === "2" || page === "4") {
            const limit = page === "4" ? 15 : 6;
            gameResults = await getPopularGames(limit).catch((err) => {
                console.error("Failed to fetch popular games for trending:", err);
                return [];
            });
        }

        // Merge results
        const combined = [...tmdbResults, ...gameResults];

        return NextResponse.json({
            ...data,
            results: combined
        });
    } catch (err) {
        console.error("[TRENDING_GET]", err);
        return new NextResponse("Internal Error", { status: 500 });
    }
}