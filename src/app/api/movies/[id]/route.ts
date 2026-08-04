import { NextResponse } from 'next/server';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return new NextResponse('TMDB API Key missing', { status: 500 });
    }

    const [detailsRes, creditsRes, providersRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${apiKey}`)
    ]);

    const details = await detailsRes.json();
    const credits = await creditsRes.json();
    const providers = await providersRes.json();

    const cast = credits.cast?.slice(0, 5).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path
    })) || [];
    
    const usProviders = providers.results?.US?.flatrate || providers.results?.US?.rent || providers.results?.US?.buy || [];

    return NextResponse.json({
      id: details.id,
      title: details.title,
      overview: details.overview,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      release_date: details.release_date,
      vote_average: details.vote_average,
      vote_count: details.vote_count,
      tagline: details.tagline,
      genres: details.genres || [],
      runtime: details.runtime,
      cast,
      providers: usProviders
    });
  } catch (error) {
    console.error('[MOVIE_DETAILS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
