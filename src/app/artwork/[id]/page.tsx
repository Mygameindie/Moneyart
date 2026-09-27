"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getArtwork, listPaymentMethods, getOrCreateConversation, deleteArtwork } from "@/lib/data";
import { Artwork, PaymentMethod } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import PaymentMethods from "@/components/PaymentMethods";

export default function ArtworkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getArtwork(params.id, user?.id)
      .then(async (found) => {
        if (cancelled) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        setArtwork(found);
        const methods = await listPaymentMethods(found.author.id);
        if (!cancelled) setPaymentMethods(methods);
      })
      .catch(() => setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params.id, user?.id]);

  async function onMessage() {
    if (!artwork || !user) return router.push("/login");
    setMessaging(true);
    try {
      const conversationId = await getOrCreateConversation(artwork.author.id);
      router.push(`/messages/${conversationId}`);
    } finally {
      setMessaging(false);
    }
  }

  async function onDelete() {
    if (!artwork || !confirm("Delete this artwork? This can't be undone.")) return;
    try {
      await deleteArtwork(artwork.id);
      router.push(`/u/${artwork.author.username}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  if (loading) return <p className="text-white/50">Loading…</p>;
  if (notFound || !artwork) return <p className="text-white/50">Artwork not found.</p>;

  const isOwner = user?.id === artwork.author.id;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="card overflow-hidden">
          {artwork.fileType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork.fileUrl} alt={artwork.title} className="max-h-[75vh] w-full object-contain bg-black" />
          ) : (
            <div className="flex flex-col items-center gap-3 p-10">
              <p className="text-white/60">{artwork.mimeType}</p>
              <a href={artwork.fileUrl} download className="btn-primary">
                Download file
              </a>
            </div>
          )}
        </div>
        <div className="mt-4 card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{artwork.title}</h1>
              {artwork.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {artwork.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/?tag=${encodeURIComponent(t)}`}
                      className="rounded-full bg-panel2 px-2 py-0.5 text-xs text-accent2 hover:bg-panel2/70"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {isOwner && (
              <button onClick={onDelete} className="btn-secondary !px-3 !py-1.5 text-xs text-accent">
                Delete
              </button>
            )}
          </div>
          {artwork.description && <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{artwork.description}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <Link href={`/u/${artwork.author.username}`} className="flex items-center gap-3">
            <Avatar src={artwork.author.avatarUrl} name={artwork.author.displayName} size={48} />
            <div>
              <p className="font-semibold">{artwork.author.displayName}</p>
              <p className="text-xs text-white/50">@{artwork.author.username}</p>
            </div>
          </Link>
          {!isOwner && (
            <button onClick={onMessage} disabled={messaging} className="btn-secondary mt-3 w-full">
              {messaging ? "Opening chat…" : "Message artist"}
            </button>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/80">Support this artist</h2>
          <PaymentMethods methods={paymentMethods} />
        </div>
      </div>
    </div>
  );
}
