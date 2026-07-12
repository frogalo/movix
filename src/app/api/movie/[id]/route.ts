import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return new NextResponse('TMDB API Key missing', { status: 500 });
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return new NextResponse('Movie not found', { status: res.status });
    }

    const details = await res.json();

    return NextResponse.json({
      details: {
        id: details.id,
        title: details.title,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        release_date: details.release_date,
        vote_average: details.vote_average,
        vote_count: details.vote_count,
        genres: details.genres || [],
        runtime: details.runtime,
      }
    });
  } catch (error) {
    console.error('[MOVIE_GET_BY_ID]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
