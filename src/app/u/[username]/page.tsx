"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, apiPost } from "@/lib/api";
import { Artwork, PaymentMethod, PublicUser } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import ArtworkCard from "@/components/ArtworkCard";
import PaymentMethods from "@/components/PaymentMethods";

type ProfileResponse = {
  user: PublicUser;
  isSelf: boolean;
  paymentMethods: PaymentMethod[];
  artworks: Artwork[];
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<ProfileResponse>(`/api/users/${params.username}`)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.username]);

  async function onMessage() {
    if (!profile) return;
    if (!user) return router.push("/login");
    setMessaging(true);
    try {
      const res = await apiPost<{ conversationId: string }>("/api/conversations", {
        username: profile.user.username,
      });
      router.push(`/messages/${res.conversationId}`);
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
