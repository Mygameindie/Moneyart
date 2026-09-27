"use client";

import Link from "next/link";
import { useState } from "react";
import { apiPost, ApiError } from "@/lib/api";
import { Artwork } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import Avatar from "./Avatar";

export default function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(artwork.likedByMe);
  const [likeCount, setLikeCount] = useState(artwork.likeCount);
  const [busy, setBusy] = useState(false);

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const res = await apiPost<{ liked: boolean; likeCount: number }>(`/api/artworks/${artwork.id}/like`);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      if (err instanceof ApiError) console.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link href={`/artwork/${artwork.id}`} className="card group block overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-panel2">
        {artwork.fileType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artwork.fileUrl}
            alt={artwork.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/40">
            <FileIcon />
            <span className="text-xs">{artwork.mimeType}</span>
          </div>
        )}
        {artwork.price != null && (
          <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-1 text-xs font-semibold text-accent2">
            ${artwork.price.toFixed(2)}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-white">{artwork.title}</h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Avatar src={artwork.author.avatarUrl} name={artwork.author.displayName} size={20} />
            <span className="truncate">{artwork.author.displayName}</span>
          </div>
          <button
            onClick={toggleLike}
            disabled={!user}
            className={`flex items-center gap-1 text-xs ${liked ? "text-accent" : "text-white/50"} disabled:opacity-50`}
          >
            <HeartIcon filled={liked} />
            {likeCount}
          </button>
        </div>
      </div>
    </Link>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
