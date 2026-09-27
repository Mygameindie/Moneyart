import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { serializeArtwork } from "@/lib/serialize";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  fileUrl: z.string().min(1, "A file upload is required"),
  fileType: z.enum(["image", "file"]),
  mimeType: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
  price: z.number().nonnegative().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag")?.trim();
  const author = searchParams.get("author")?.trim();
  const cursor = searchParams.get("cursor") || undefined;
  const take = Math.min(Number(searchParams.get("take")) || 24, 48);

  const where: Record<string, unknown> = {};
  if (tag) where.tags = { contains: tag };
  if (author) where.author = { username: author };

  const artworks = await prisma.artwork.findMany({
    where,
    include: { author: true, likes: true },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = artworks.length > take;
  const page = artworks.slice(0, take);

  return NextResponse.json({
    artworks: page.map((a) => serializeArtwork(a, auth?.userId)),
    nextCursor: hasMore ? page[page.length - 1]?.id : null,
  });
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { title, description, fileUrl, fileType, mimeType, tags, price } = parsed.data;

  const artwork = await prisma.artwork.create({
    data: {
      title,
      description,
      fileUrl,
      fileType,
      mimeType,
      tags: tags.join(","),
      price: price ?? null,
      authorId: auth.userId,
    },
    include: { author: true, likes: true },
  });

  return NextResponse.json({ artwork: serializeArtwork(artwork, auth.userId) }, { status: 201 });
}
