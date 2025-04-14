import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const apiKey = process.env.TMDB_API_KEY;
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&page=${page}`;

    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json(data);
}