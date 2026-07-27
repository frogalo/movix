import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GameStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameIdStr = searchParams.get("gameId");

    if (gameIdStr) {
      const gameId = Number(gameIdStr);
      if (isNaN(gameId)) {
        return new NextResponse("Invalid Game ID", { status: 400 });
      }

      const userGame = await prisma.userGame.findUnique({
        where: {
          userId_gameId: {
            userId: session.user.id,
            gameId,
          },
        },
      });

      return NextResponse.json(userGame || null);
    }

    const userGames = await prisma.userGame.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(userGames);
  } catch (error) {
    console.error("[GAMES_GET]", error);
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
    const { gameId, title, status, rating, review, posterPath, backdropPath, platforms } = body;

    if (!gameId || !title) {
      return new NextResponse("Game ID and Title are required", { status: 400 });
    }

    const gameIdNum = Number(gameId);
    if (isNaN(gameIdNum)) {
      return new NextResponse("Invalid Game ID", { status: 400 });
    }

    // Validate status if provided
    if (status && !Object.values(GameStatus).includes(status)) {
      return new NextResponse("Invalid status value", { status: 400 });
    }

    const userGame = await prisma.userGame.upsert({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId: gameIdNum,
        },
      },
      update: {
        status: status || undefined,
        rating: rating !== undefined ? rating : undefined,
        review: review !== undefined ? review : undefined,
        posterPath: posterPath || undefined,
        backdropPath: backdropPath || undefined,
        platforms: platforms || undefined,
      },
      create: {
        userId: session.user.id,
        gameId: gameIdNum,
        title,
        status: status || GameStatus.BACKLOG,
        rating: rating !== undefined ? rating : null,
        review: review || null,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        platforms: platforms || [],
      },
    });

    return NextResponse.json(userGame);
  } catch (error) {
    console.error("[GAMES_POST]", error);
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

    if (!gameIdStr) {
      return new NextResponse("Game ID is required", { status: 400 });
    }

    const gameId = Number(gameIdStr);
    if (isNaN(gameId)) {
      return new NextResponse("Invalid Game ID", { status: 400 });
    }

    await prisma.userGame.delete({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GAMES_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
