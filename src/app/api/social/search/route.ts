import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const currentUserId = session.user.id;
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { isPrivate: false },
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { startsWith: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            ratings: true,
            tvShows: true,
          },
        },
        followers: {
          where: { followerId: currentUserId },
          select: { followerId: true },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      createdAt: u.createdAt,
      _count: u._count,
      isFollowing: u.followers.length > 0,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("[SOCIAL_SEARCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}