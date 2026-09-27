const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "insecure-dev-secret";
const AUTH_COOKIE_NAME = "moneyart_token";

function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(AUTH_COOKIE_NAME.length + 1));
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    path: "/socket.io",
  });

  io.use((socket, next2) => {
    try {
      const token = getTokenFromCookieHeader(socket.handshake.headers.cookie);
      if (!token) return next2(new Error("Unauthorized"));
      const payload = jwt.verify(token, JWT_SECRET);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next2();
    } catch (err) {
      next2(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket.data;

    // Personal room so other clients can notify "new conversation" etc.
    socket.join(`user:${userId}`);

    socket.on("conversation:join", async (conversationId, ack) => {
      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!participant) {
          ack?.({ ok: false, error: "Not a participant" });
          return;
        }
        socket.join(conversationId);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: "Failed to join" });
      }
    });

    socket.on("message:send", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        const content = String(payload?.content || "").trim();
        if (!conversationId || !content) {
          ack?.({ ok: false, error: "Invalid message" });
          return;
        }
        if (content.length > 4000) {
          ack?.({ ok: false, error: "Message too long" });
          return;
        }

        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!participant) {
          ack?.({ ok: false, error: "Not a participant" });
          return;
        }

        const message = await prisma.message.create({
          data: { conversationId, senderId: userId, content },
          include: { sender: true },
        });

        const dto = {
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          createdAt: message.createdAt,
          sender: {
            id: message.sender.id,
            username: message.sender.username,
            displayName: message.sender.displayName,
            avatarUrl: message.sender.avatarUrl,
          },
        };

        io.to(conversationId).emit("message:new", dto);

        // Notify the other participant's personal room in case they haven't
        // joined the conversation room yet (e.g. conversation list view).
        const others = await prisma.conversationParticipant.findMany({
          where: { conversationId, userId: { not: userId } },
        });
        others.forEach((p) => io.to(`user:${p.userId}`).emit("conversation:update", { conversationId }));

        ack?.({ ok: true, message: dto });
      } catch (err) {
        console.error("message:send failed", err);
        ack?.({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("conversation:leave", (conversationId) => {
      socket.leave(conversationId);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> MoneyArt ready on http://${hostname}:${port}`);
    });
});
