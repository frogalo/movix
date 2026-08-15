import { TMDB_BASE_URL } from '@/lib/config';
import { NextResponse } from 'next/server';
import { fetchWithCache } from '@/lib/tmdbCache';
import { getAwardsForImdbId } from '@/lib/awards';

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

    const [details, credits, images] = await Promise.all([
      fetchWithCache(`${TMDB_BASE_URL}/person/${id}?api_key=${apiKey}`, 3600),
      fetchWithCache(`${TMDB_BASE_URL}/person/${id}/combined_credits?api_key=${apiKey}`, 3600),
      fetchWithCache(`${TMDB_BASE_URL}/person/${id}/images?api_key=${apiKey}`, 3600),
    ]);

    if (!details || details.status_code === 34) {
      return new NextResponse('Person not found', { status: 404 });
    }

    // Format cast credits and remove duplicates by media_type + id
    const seenIds = new Set<string>();
    const rawCast = Array.isArray(credits?.cast) ? credits.cast : [];
    
    const formattedCast = rawCast
      .filter((item: any) => {
        const key = `${item.media_type || (item.first_air_date ? 'tv' : 'movie')}-${item.id}`;
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      })
      .map((item: any) => {
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        return {
          id: item.id,
          title: item.title || item.name || 'Untitled',
          media_type: mediaType,
          character: item.character || '',
          release_date: item.release_date || item.first_air_date || null,
          poster_path: item.poster_path || null,
          backdrop_path: item.backdrop_path || null,
          vote_average: typeof item.vote_average === 'number' ? item.vote_average : 0,
          vote_count: item.vote_count || 0,
          popularity: item.popularity || 0,
          overview: item.overview || '',
          episode_count: item.episode_count || null,
        };
      })
      // Sort by popularity descending
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

    // Format profiles photos
    const profilePhotos = Array.isArray(images?.profiles)
      ? images.profiles.slice(0, 12).map((img: any) => img.file_path).filter(Boolean)
      : [];

    const awards = await getAwardsForImdbId(details.imdb_id);

    return NextResponse.json({
      id: details.id,
      name: details.name,
      biography: details.biography || '',
      birthday: details.birthday || null,
      deathday: details.deathday || null,
      place_of_birth: details.place_of_birth || null,
      profile_path: details.profile_path || null,
      known_for_department: details.known_for_department || 'Acting',
      gender: details.gender,
      popularity: details.popularity || 0,
      imdb_id: details.imdb_id || null,
      also_known_as: details.also_known_as || [],
      homepage: details.homepage || null,
      photos: profilePhotos,
      awards,
      // Backward compatibility
      oscars: {
        hasWonOscar: awards.oscarWins > 0,
        count: awards.oscarWins,
        awards: awards.wins.filter(w => w.type === 'oscar')
      },
      credits: {
        cast: formattedCast,
      },
    });
  } catch (error) {
    console.error('[PERSON_DETAILS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
