"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProfileByUsername, listArtworks, listPaymentMethods, getOrCreateConversation } from "@/lib/data";
import { Artwork, PaymentMethod, PublicUser } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import ArtworkCard from "@/components/ArtworkCard";
import PaymentMethods from "@/components/PaymentMethods";

type ProfileData = {
  user: PublicUser;
  paymentMethods: PaymentMethod[];
  artworks: Artwork[];
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProfileByUsername(params.username)
      .then(async (found) => {
        if (cancelled) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        const [artworks, paymentMethods] = await Promise.all([
          listArtworks({ authorId: found.id, viewerId: user?.id }),
          listPaymentMethods(found.id),
        ]);
        if (!cancelled) setProfile({ user: found, artworks, paymentMethods });
      })
      .catch(() => setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params.username, user?.id]);

  async function onMessage() {
    if (!profile) return;
    if (!user) return router.push("/login");
    setMessaging(true);
    try {
      const conversationId = await getOrCreateConversation(profile.user.id);
      router.push(`/messages/${conversationId}`);
    } finally {
      setMessaging(false);
    }
  }

  if (loading) return <p className="text-white/50">Loading…</p>;
  if (notFound || !profile) return <p className="text-white/50">User not found.</p>;

  const isSelf = user?.id === profile.user.id;

  return (
    <div>
      <div className="card mb-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={profile.user.avatarUrl} name={profile.user.displayName} size={72} />
          <div>
            <h1 className="text-xl font-bold">{profile.user.displayName}</h1>
            <p className="text-sm text-white/50">@{profile.user.username}</p>
            {profile.user.bio && <p className="mt-2 max-w-md text-sm text-white/70">{profile.user.bio}</p>}
          </div>
        </div>
        {isSelf ? (
          <a href="/settings" className="btn-secondary">
            Edit profile
          </a>
        ) : (
          <button onClick={onMessage} disabled={messaging} className="btn-primary">
            {messaging ? "Opening chat…" : "Message"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Gallery</h2>
          {profile.artworks.length === 0 ? (
            <div className="card p-8 text-center text-white/50">No artwork posted yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {profile.artworks.map((a) => (
                <ArtworkCard key={a.id} artwork={a} />
              ))}
            </div>
          )}
        </div>
        <div className="card h-fit p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/80">Support this artist</h2>
          <PaymentMethods methods={profile.paymentMethods} />
        </div>
      </div>
    </div>
  );
}
