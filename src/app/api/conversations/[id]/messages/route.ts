import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

async function assertParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await assertParticipant(params.id, auth.userId);
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take")) || 50, 100);
  const before = searchParams.get("before") || undefined;

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    include: { sender: true },
    orderBy: { createdAt: "desc" },
    take,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
  });

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: auth.userId } },
    data: { lastReadAt: new Date() },
  });

  const dto = messages
    .map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      content: m.content,
      createdAt: m.createdAt,
      sender: {
        id: m.sender.id,
        username: m.sender.username,
        displayName: m.sender.displayName,
        avatarUrl: m.sender.avatarUrl,
      },
    }))
    .reverse();

  return NextResponse.json({ messages: dto });
}
