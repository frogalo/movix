import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { isPrivate } = body;

    if (typeof isPrivate !== "boolean") {
      return new NextResponse("isPrivate must be a boolean", { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { isPrivate },
    });

    return NextResponse.json({ success: true, isPrivate });
  } catch (error) {
    console.error("[USER_SETTINGS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
