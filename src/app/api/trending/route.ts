import { TMDB_BASE_URL } from '@/lib/config';
import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/tmdbCache";

export async function GET(req: NextRequest) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return new NextResponse("TMDB API Key missing", { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const url = `${TMDB_BASE_URL}/trending/all/week?api_key=${apiKey}&page=${page}`;

    try {
        // Cache trending data for 1 hour (3600 seconds)
        const data = await fetchWithCache(url, 3600);

        if (!data) {
            return new NextResponse("Failed to fetch trending from TMDB", { status: 502 });
        }

        let tmdbResults = [];
        if (data.results && Array.isArray(data.results)) {
            tmdbResults = data.results.filter((item: any) => item.media_type !== 'person');
        }

        return NextResponse.json({
            ...data,
            results: tmdbResults
        });
    } catch (err) {
        console.error("[TRENDING_GET]", err);
        return new NextResponse("Internal Error", { status: 500 });
    }
}