import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const zipPath = 'C:\\Users\\tmpAdmin\\Downloads\\tvtime-export-2026-07-11.zip';
    const jsonFileName = 'tvtime-series-2026-07-11.json';

    // We can extract to a temp workspace folder inside the project
    const tempDir = path.join(process.cwd(), '.next', 'cache', 'tvtime-import-temp');
    const jsonPath = path.join(tempDir, jsonFileName);

    console.log('[IMPORT] Checking if TV Time data is already extracted...');

    if (!fs.existsSync(jsonPath)) {
      if (!fs.existsSync(zipPath)) {
        return new NextResponse(`TV Time export zip file not found at ${zipPath}`, { status: 404 });
      }

      console.log('[IMPORT] Extracting zip file...');
      fs.mkdirSync(tempDir, { recursive: true });
      // Run powershell to extract only the JSON file to tempDir
      const powershellCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`;
      execSync(powershellCommand);
    }

    if (!fs.existsSync(jsonPath)) {
      return new NextResponse(`Failed to find ${jsonFileName} after extraction`, { status: 500 });
    }

    console.log('[IMPORT] Reading and parsing JSON file...');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const shows = JSON.parse(rawData);

    if (!Array.isArray(shows)) {
      return new NextResponse('Invalid import file structure, expected an array of shows', { status: 400 });
    }

    console.log(`[IMPORT] Starting database transaction for ${shows.length} shows...`);

    let importedShowsCount = 0;
    let importedEpisodesCount = 0;

    // Process in batches or sequential loop
    for (const show of shows) {
      if (!show.id || !show.id.tvdb) {
        continue; // skip shows without TVDB ID
      }

      const tvdbId = Number(show.id.tvdb);

      // 1. Upsert TV Show
      const tvShow = await prisma.tvShow.upsert({
        where: {
          userId_tvdbId: {
            userId,
            tvdbId,
          },
        },
        update: {
          title: show.title || 'Unknown Show',
          status: show.status || 'watching',
          isFavorite: show.is_favorite || false,
          imdbId: show.id.imdb || null,
        },
        create: {
          userId,
          tvdbId,
          title: show.title || 'Unknown Show',
          status: show.status || 'watching',
          isFavorite: show.is_favorite || false,
          imdbId: show.id.imdb || null,
        },
      });

      importedShowsCount++;

      // 2. Extract and prepare watched episodes
      const episodesToInsert: any[] = [];
      if (show.seasons && Array.isArray(show.seasons)) {
        for (const season of show.seasons) {
          const seasonNumber = Number(season.number);
          if (season.episodes && Array.isArray(season.episodes)) {
            for (const ep of season.episodes) {
              const isWatched = ep.is_watched || false;
              if (isWatched) {
                episodesToInsert.push({
                  showId: tvShow.id,
                  tvdbId: Number(ep.id.tvdb),
                  seasonNumber,
                  episodeNumber: Number(ep.number),
                  name: ep.name || null,
                  isWatched: true,
                  watchedAt: ep.watched_at ? new Date(ep.watched_at) : null,
                  rewatchCount: ep.rewatch_count || 0,
                });
              }
            }
          }
        }
      }

      // 3. Clear existing watched episodes for this show and bulk insert
      if (episodesToInsert.length > 0) {
        await prisma.tvEpisode.deleteMany({
          where: {
            showId: tvShow.id,
          },
        });

        await prisma.tvEpisode.createMany({
          data: episodesToInsert,
        });

        importedEpisodesCount += episodesToInsert.length;
      }
    }

    console.log(`[IMPORT] Success! Imported ${importedShowsCount} shows and ${importedEpisodesCount} episodes.`);

    return NextResponse.json({
      success: true,
      showsCount: importedShowsCount,
      episodesCount: importedEpisodesCount,
    });
  } catch (error: any) {
    console.error('[IMPORT_TVTIME_POST]', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
