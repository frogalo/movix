import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const currentUserId = session.user.id;
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return new NextResponse("Missing targetUserId", { status: 400 });
    }

    if (targetUserId === currentUserId) {
      return new NextResponse("Cannot follow yourself", { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isPrivate: true },
    });

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });
      return NextResponse.json({ isFollowing: false });
    } else {
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      });
      return NextResponse.json({ isFollowing: true });
    }
  } catch (error) {
    console.error("[SOCIAL_FOLLOW_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isFollowing: false });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return new NextResponse("Missing targetUserId", { status: 400 });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetUserId,
        },
      },
    });

    return NextResponse.json({ isFollowing: !!existingFollow });
  } catch (error) {
    console.error("[SOCIAL_FOLLOW_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}