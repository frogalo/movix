import { TMDB_BASE_URL } from '@/lib/config';
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
      `${TMDB_BASE_URL}/tv/${id}/videos?language=en-US&api_key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return new NextResponse('Failed to fetch videos', { status: res.status });
    }

    const data = await res.json();

    // Prefer official trailers from YouTube, fall back to any trailer
    const results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
      published_at: string;
    }> = data.results ?? [];

    const youtubeTrailers = results.filter(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );

    // Sort: official first, then by published date descending
    youtubeTrailers.sort((a, b) => {
      if (a.official !== b.official) return a.official ? -1 : 1;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    const teasers = results.filter(
      (v) => v.site === 'YouTube' && v.type === 'Teaser'
    );

    const videos = [...youtubeTrailers, ...teasers].slice(0, 5).map((v) => ({
      id: v.id,
      key: v.key,
      name: v.name,
      type: v.type,
      official: v.official,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[TV_VIDEOS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
