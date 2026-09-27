import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { serializeArtwork, serializeUser } from "@/lib/serialize";

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  const auth = getAuthFromRequest(req);
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: {
      paymentMethods: true,
      artworks: { include: { author: true, likes: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: serializeUser(user),
    isSelf: auth?.userId === user.id,
    // Payment info is intentionally public: the whole point is that buyers can
    // pay the artist directly (100% goes to them, no platform cut).
    paymentMethods: user.paymentMethods.map((pm) => ({
      id: pm.id,
      type: pm.type,
      label: pm.label,
      value: pm.value,
      qrImageUrl: pm.qrImageUrl,
    })),
    artworks: user.artworks.map((a) => serializeArtwork(a, auth?.userId)),
  });
}
