"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Artwork } from "@/lib/types";
import ArtworkCard from "@/components/ArtworkCard";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-white/50">Loading…</p>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tag = searchParams.get("tag") || "";

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState(tag);

  useEffect(() => {
    setLoading(true);
    const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
    api<{ artworks: Artwork[] }>(`/api/artworks${qs}`)
      .then((data) => setArtworks(data.artworks))
      .finally(() => setLoading(false));
  }, [tag]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Explore art</h1>
          <p className="text-sm text-white/60">
            Any medium, any format. Support artists directly — they keep 100% of what you send.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(tagInput ? `/?tag=${encodeURIComponent(tagInput)}` : "/");
          }}
          className="flex gap-2"
        >
          <input
            className="input max-w-[200px]"
            placeholder="Filter by tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
          />
          {tag && (
            <button type="button" className="btn-secondary" onClick={() => router.push("/")}>
              Clear
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <p className="text-white/50">Loading…</p>
      ) : artworks.length === 0 ? (
        <div className="card p-10 text-center text-white/50">
          No artwork {tag ? `tagged "${tag}"` : "yet"}. Be the first to{" "}
          <a href="/upload" className="text-accent2 hover:underline">
            upload something
          </a>
          .
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {artworks.map((a) => (
            <ArtworkCard key={a.id} artwork={a} />
          ))}
        </div>
      )}
    </div>
  );
}
