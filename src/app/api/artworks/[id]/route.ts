import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { serializeArtwork } from "@/lib/serialize";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req);
  const artwork = await prisma.artwork.findUnique({
    where: { id: params.id },
    include: { author: true, likes: true },
  });
  if (!artwork) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ artwork: serializeArtwork(artwork, auth?.userId) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const artwork = await prisma.artwork.findUnique({ where: { id: params.id } });
  if (!artwork) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (artwork.authorId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.artwork.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
