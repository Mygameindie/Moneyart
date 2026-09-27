import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const artwork = await prisma.artwork.findUnique({ where: { id: params.id } });
  if (!artwork) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.like.findUnique({
    where: { userId_artworkId: { userId: auth.userId, artworkId: params.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId: auth.userId, artworkId: params.id } });
  }

  const likeCount = await prisma.like.count({ where: { artworkId: params.id } });
  return NextResponse.json({ liked: !existing, likeCount });
}
