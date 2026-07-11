import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const apiKey = process.env.TMDB_API_KEY;
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1&api_key=${apiKey}`);
    
    if (!res.ok) throw new Error('Failed to search');
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[SEARCH_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
