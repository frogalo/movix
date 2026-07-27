interface IgdbTokenCache {
  accessToken: string;
  expiresAt: number;
}

const cacheKey = Symbol.for("movix.igdbTokenCache");
const globalSymbol = global as unknown as { [cacheKey]?: IgdbTokenCache };

async function getIgdbToken(): Promise<string> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is missing from environment variables.");
  }

  const cached = globalSymbol[cacheKey];
  const now = Date.now();

  if (cached && cached.expiresAt > now + 60000) {
    return cached.accessToken;
  }

  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!res.ok) {
      throw new Error(`Twitch token fetch failed: ${res.statusText}`);
    }

    const data = await res.json();
    const expiresAt = now + (data.expires_in * 1000);

    globalSymbol[cacheKey] = {
      accessToken: data.access_token,
      expiresAt,
    };

    return data.access_token;
  } catch (error) {
    console.error("Error fetching IGDB Twitch token:", error);
    throw error;
  }
}

export async function queryIgdb(endpoint: string, queryBody: string): Promise<any[]> {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const token = await getIgdbToken();

    if (!clientId) {
      throw new Error("TWITCH_CLIENT_ID is missing.");
    }

    const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: queryBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`IGDB query failed on endpoint '${endpoint}': ${res.status} ${res.statusText} - ${errText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Error querying IGDB endpoint '${endpoint}':`, error);
    return [];
  }
}

export function getIgdbImageUrl(
  imageIdOrUrl: string | null | undefined,
  size: "t_cover_big" | "t_screenshot_med" | "t_720p" | "t_thumb" = "t_cover_big"
): string {
  if (!imageIdOrUrl) return "";
  let hash = imageIdOrUrl;
  if (imageIdOrUrl.includes("/")) {
    const parts = imageIdOrUrl.split("/");
    hash = parts[parts.length - 1];
  }
  hash = hash.split(".")[0];
  return `https://images.igdb.com/igdb/image/upload/${size}/${hash}.jpg`;
}

export async function searchIgdbGames(query: string): Promise<any[]> {
  if (!query || query.trim().length < 3) return [];
  // Clean up double quotes in search query to prevent syntax issues
  const cleanQuery = query.replace(/"/g, '\\"');
  
  const body = `search "${cleanQuery}"; fields name, cover.image_id, first_release_date, summary, platforms.name; limit 8;`;
  const results = await queryIgdb("games", body);

  return results.map((game) => ({
    id: game.id,
    title: game.name,
    media_type: "game",
    poster_path: game.cover?.image_id ? getIgdbImageUrl(game.cover.image_id, "t_cover_big") : null,
    release_date: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : null,
    summary: game.summary || null,
    platforms: game.platforms?.map((p: any) => p.name) || [],
  }));
}

export async function getIgdbGameDetails(gameId: number): Promise<any | null> {
  const body = `fields name, summary, cover.image_id, screenshots.image_id, platforms.name, genres.name, first_release_date, total_rating; where id = ${gameId};`;
  const results = await queryIgdb("games", body);
  if (!results || results.length === 0) return null;

  const game = results[0];
  return {
    id: game.id,
    title: game.name,
    summary: game.summary || "",
    posterPath: game.cover?.image_id ? getIgdbImageUrl(game.cover.image_id, "t_cover_big") : null,
    backdropPath: game.screenshots?.[0]?.image_id ? getIgdbImageUrl(game.screenshots[0].image_id, "t_720p") : null,
    screenshots: game.screenshots?.map((s: any) => getIgdbImageUrl(s.image_id, "t_screenshot_med")) || [],
    platforms: game.platforms?.map((p: any) => p.name) || [],
    genres: game.genres?.map((g: any) => g.name) || [],
    releaseDate: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : null,
    rating: game.total_rating ? Math.round(game.total_rating) : null,
  };
}

export async function getPopularGames(limit: number = 8): Promise<any[]> {
  // Fetch games with cover artwork sorted by rating_count desc
  const body = `fields name, cover.image_id, first_release_date, summary, platforms.name, total_rating; where first_release_date != null & cover != null; sort rating_count desc; limit ${limit};`;
  const results = await queryIgdb("games", body);

  return results.map((game) => ({
    id: game.id,
    title: game.name,
    media_type: "game",
    poster_path: game.cover?.image_id ? getIgdbImageUrl(game.cover.image_id, "t_cover_big") : null,
    release_date: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : null,
    vote_average: game.total_rating ? game.total_rating / 10 : 0,
    vote_count: 0,
    overview: game.summary || "",
    platforms: game.platforms?.map((p: any) => p.name) || [],
  }));
}
