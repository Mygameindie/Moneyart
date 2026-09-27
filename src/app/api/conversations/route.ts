import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { serializeUser } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: auth.userId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const result = conversations
    .map((c) => {
      const me = c.participants.find((p) => p.userId === auth.userId);
      const other = c.participants.find((p) => p.userId !== auth.userId);
      const lastMessage = c.messages[0];
      return {
        id: c.id,
        otherUser: other ? serializeUser(other.user) : null,
        lastMessage: lastMessage
          ? { content: lastMessage.content, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
          : null,
        unread:
          !!lastMessage &&
          lastMessage.senderId !== auth.userId &&
          (!me?.lastReadAt || lastMessage.createdAt > me.lastReadAt),
        updatedAt: lastMessage?.createdAt ?? c.createdAt,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ conversations: result });
}

const createSchema = z.object({
  username: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A target username is required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === auth.userId) {
    return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: auth.userId } } },
        { participants: { some: { userId: target.id } } },
      ],
    },
  });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: auth.userId }, { userId: target.id }],
        },
      },
    }));

  return NextResponse.json({ conversationId: conversation.id, otherUser: serializeUser(target) });
}
