import { NextResponse } from "next/server";
import { getIgdbGameDetails } from "@/lib/igdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameIdStr = searchParams.get("gameId");

    if (!gameIdStr) {
      return new NextResponse("Game ID is required", { status: 400 });
    }

    const gameId = Number(gameIdStr);
    if (isNaN(gameId)) {
      return new NextResponse("Invalid Game ID", { status: 400 });
    }

    const details = await getIgdbGameDetails(gameId);
    if (!details) {
      return new NextResponse("Game not found", { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error("[GAMES_DETAILS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
