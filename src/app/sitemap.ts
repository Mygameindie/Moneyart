import type { MetadataRoute } from "next";

const SITE_URL = "https://moneyart.vercel.app";

export const revalidate = 3600;

type PublicArtwork = {
  id: string;
  created_at?: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Keep the homepage discoverable even if Supabase is temporarily unavailable.
  if (!supabaseUrl || !supabaseKey) return entries;

  try {
    const endpoint = new URL("/rest/v1/artworks", supabaseUrl);
    endpoint.searchParams.set("select", "id,created_at");
    endpoint.searchParams.set("order", "created_at.desc");
    endpoint.searchParams.set("limit", "1000");

    const response = await fetch(endpoint.toString(), {
      headers: { apikey: supabaseKey },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return entries;

    const artworks = (await response.json()) as PublicArtwork[];
    if (!Array.isArray(artworks)) return entries;

    for (const artwork of artworks) {
      if (typeof artwork.id !== "string" || !artwork.id) continue;
      entries.push({
        url: `${SITE_URL}/artwork/${encodeURIComponent(artwork.id)}`,
        ...(artwork.created_at ? { lastModified: new Date(artwork.created_at) } : {}),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // The homepage remains listed if the public artwork query fails.
  }

  return entries;
}
