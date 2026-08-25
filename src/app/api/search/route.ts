import { TMDB_BASE_URL } from '@/lib/config';
import { NextResponse } from 'next/server';
import { fetchWithCache } from "@/lib/tmdbCache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ results: [] });
    }
    
    // Fetch TMDB results with 15-minute in-memory cache
    const tmdbUrl = `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1&api_key=${apiKey}`;
    const data = await fetchWithCache(tmdbUrl, 900);
    const tmdbResults = data?.results || [];

    // Ensure TMDB results have correct media_type and merge
    const formattedTmdb = tmdbResults.map((r: any) => ({
      ...r,
      media_type: r.media_type || (r.known_for ? 'person' : r.title ? 'movie' : 'tv'),
    }));

    return NextResponse.json({ results: formattedTmdb });
  } catch (error) {
    console.error('[SEARCH_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
