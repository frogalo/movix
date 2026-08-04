import { TMDB_BASE_URL } from '@/lib/config';
import { NextResponse } from 'next/server';
import { searchIgdbGames } from '@/lib/igdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const apiKey = process.env.TMDB_API_KEY;
    
    // Fetch TMDB results (Movies and TV Shows)
    const tmdbPromise = fetch(
      `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1&api_key=${apiKey}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to search TMDB');
        const data = await res.json();
        return data.results || [];
      })
      .catch((err) => {
        console.error('[SEARCH_TMDB_ERROR]', err);
        return [];
      });

    const igdbPromise = searchIgdbGames(query)
      .catch((err) => {
        console.error('[SEARCH_IGDB_ERROR]', err);
        return [];
      });

    const [tmdbResults, igdbResults] = await Promise.all([tmdbPromise, igdbPromise]);

    // Ensure TMDB results have correct media_type and merge
    const formattedTmdb = tmdbResults.map((r: any) => ({
      ...r,
      media_type: r.media_type || (r.title ? 'movie' : 'tv'),
    }));

    const combinedResults = [...formattedTmdb, ...igdbResults];

    return NextResponse.json({ results: combinedResults });
  } catch (error) {
    console.error('[SEARCH_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
