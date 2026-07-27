import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameIdStr = searchParams.get("gameId");
    const mediaIdStr = searchParams.get("mediaId");
    const mediaType = searchParams.get("mediaType");

    if (gameIdStr) {
      const gameId = Number(gameIdStr);
      if (isNaN(gameId)) {
        return new NextResponse("Invalid Game ID", { status: 400 });
      }
      const links = await prisma.mediaGameLink.findMany({
        where: { gameId },
      });
      return NextResponse.json(links);
    }

    if (mediaIdStr && mediaType) {
      const mediaId = Number(mediaIdStr);
      if (isNaN(mediaId)) {
        return new NextResponse("Invalid Media ID", { status: 400 });
      }
      if (mediaType !== "movie" && mediaType !== "tv") {
        return new NextResponse("Invalid Media Type", { status: 400 });
      }

      const links = await prisma.mediaGameLink.findMany({
        where: {
          mediaId,
          mediaType,
        },
      });
      return NextResponse.json(links);
    }

    return new NextResponse("Missing query parameters", { status: 400 });
  } catch (error) {
    console.error("[GAMES_MATCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { gameId, gameTitle, mediaType, mediaId, mediaTitle, confidence } = body;

    if (!gameId || !gameTitle || !mediaType || !mediaId || !mediaTitle) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const gameIdNum = Number(gameId);
    const mediaIdNum = Number(mediaId);

    if (isNaN(gameIdNum) || isNaN(mediaIdNum)) {
      return new NextResponse("Game ID and Media ID must be numbers", { status: 400 });
    }

    if (mediaType !== "movie" && mediaType !== "tv") {
      return new NextResponse("Media type must be 'movie' or 'tv'", { status: 400 });
    }

    const link = await prisma.mediaGameLink.upsert({
      where: {
        gameId_mediaType_mediaId: {
          gameId: gameIdNum,
          mediaType,
          mediaId: mediaIdNum,
        },
      },
      update: {
        confidence: confidence !== undefined ? Number(confidence) : 1.0,
      },
      create: {
        gameId: gameIdNum,
        gameTitle,
        mediaType,
        mediaId: mediaIdNum,
        mediaTitle,
        confidence: confidence !== undefined ? Number(confidence) : 1.0,
      },
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("[GAMES_MATCH_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameIdStr = searchParams.get("gameId");
    const mediaType = searchParams.get("mediaType");
    const mediaIdStr = searchParams.get("mediaId");

    if (!gameIdStr || !mediaType || !mediaIdStr) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    const gameId = Number(gameIdStr);
    const mediaId = Number(mediaIdStr);

    if (isNaN(gameId) || isNaN(mediaId)) {
      return new NextResponse("Invalid ID parameters", { status: 400 });
    }

    await prisma.mediaGameLink.delete({
      where: {
        gameId_mediaType_mediaId: {
          gameId,
          mediaType,
          mediaId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GAMES_MATCH_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
