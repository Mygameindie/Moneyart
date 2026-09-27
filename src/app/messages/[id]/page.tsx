"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ChatMessage, ConversationSummary } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { getSocket } from "@/lib/socketClient";
import Avatar from "@/components/Avatar";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { user, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<ConversationSummary["otherUser"]>(null);
  const [fetching, setFetching] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setFetching(true);
    Promise.all([
      api<{ messages: ChatMessage[] }>(`/api/conversations/${conversationId}/messages`),
      api<{ conversations: ConversationSummary[] }>("/api/conversations"),
    ]).then(([msgData, convData]) => {
      if (cancelled) return;
      setMessages(msgData.messages);
      const conv = convData.conversations.find((c) => c.id === conversationId);
      setOtherUser(conv?.otherUser ?? null);
      setFetching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, user]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      socket.emit("conversation:join", conversationId);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onMessage(msg: ChatMessage) {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);

    if (socket.connected) onConnect();

    return () => {
      socket.emit("conversation:leave", conversationId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
    };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    getSocket().emit(
      "message:send",
      { conversationId, content },
      (ack: { ok: boolean; error?: string; message?: ChatMessage }) => {
        setSending(false);
        if (ack?.ok && ack.message) {
          setDraft("");
          setMessages((prev) => (prev.some((m) => m.id === ack.message!.id) ? prev : [...prev, ack.message!]));
        }
      }
    );
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-2xl flex-col">
      <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
        <Link href="/messages" className="text-white/50 hover:text-white">
          ←
        </Link>
        {otherUser && (
          <Link href={`/u/${otherUser.username}`} className="flex items-center gap-2">
            <Avatar src={otherUser.avatarUrl} name={otherUser.displayName} size={36} />
            <span className="font-medium">{otherUser.displayName}</span>
          </Link>
        )}
        <span className={`ml-auto h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-white/20"}`} title={connected ? "Connected" : "Connecting…"} />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {fetching ? (
          <p className="text-white/50">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-white/40">Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender.id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-accent text-white" : "bg-panel2 text-white/90"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="mt-3 flex gap-2 border-t border-border pt-3">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={4000}
        />
        <button className="btn-primary" disabled={sending || !draft.trim()} type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
