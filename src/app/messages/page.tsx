"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listConversations } from "@/lib/data";
import { ConversationSummary } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    listConversations(user.id)
      .then(setConversations)
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>
      {fetching ? (
        <p className="text-white/50">Loading…</p>
      ) : conversations.length === 0 ? (
        <div className="card p-8 text-center text-white/50">
          No conversations yet. Visit an artist&apos;s profile and hit &quot;Message&quot; to start
          chatting.
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 p-4 hover:bg-panel2"
            >
              <Avatar
                src={c.otherUser?.avatarUrl}
                name={c.otherUser?.displayName || "?"}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium">{c.otherUser?.displayName ?? "Unknown user"}</p>
                  {c.lastMessage && <span className="shrink-0 text-xs text-white/40">{timeAgo(c.lastMessage.createdAt)}</span>}
                </div>
                <p className={`truncate text-sm ${c.unread ? "font-semibold text-white" : "text-white/50"}`}>
                  {c.lastMessage ? c.lastMessage.content : "No messages yet"}
                </p>
              </div>
              {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
