"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { listMessages, listConversations, sendMessage, subscribeToMessages, markConversationRead } from "@/lib/data";
import { ChatMessage, ConversationSummary } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setFetching(true);
    Promise.all([listMessages(conversationId), listConversations(user.id), markConversationRead(conversationId, user.id)]).then(
      ([msgs, conversations]) => {
        if (cancelled) return;
        setMessages(msgs);
        setOtherUser(conversations.find((c) => c.id === conversationId)?.otherUser ?? null);
        setFetching(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [conversationId, user]);

  // Supabase Realtime: stream new INSERTs on this conversation's messages
  // straight from Postgres (gated by the same RLS policy as a normal read).
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToMessages(conversationId, (raw) => {
      const msg: ChatMessage = {
        id: raw.id as string,
        conversationId: raw.conversation_id as string,
        content: raw.content as string,
        createdAt: raw.created_at as string,
        sender: { id: raw.sender_id as string, username: "", displayName: "", avatarUrl: null },
      };
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return unsubscribe;
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending || !user) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, user.id, content);
      setDraft("");
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    } finally {
      setSending(false);
    }
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

      <form onSubmit={onSend} className="mt-3 flex gap-2 border-t border-border pt-3">
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
