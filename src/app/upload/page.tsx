"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPublicFile, createArtwork } from "@/lib/data";
import { useAuth } from "@/components/AuthProvider";

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  function onPickFile(f: File | null) {
    setFile(f);
    if (f && f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload — any art format is welcome.");
      return;
    }
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const uploaded = await uploadPublicFile(user.id, "artworks", file);
      const artwork = await createArtwork({
        title,
        description,
        fileUrl: uploaded.url,
        fileType: uploaded.fileType,
        mimeType: uploaded.mimeType,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        price: price ? Number(price) : null,
        authorId: user.id,
      });
      router.push(`/artwork/${artwork.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">Upload your art</h1>
      <p className="mb-6 text-sm text-white/60">
        Any type of art is welcome — illustrations, photos, music, 3D models, writing, whatever
        you make. Images get a gallery preview; other files show as a download.
      </p>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-accent2"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="max-h-64 rounded-lg object-contain" />
          ) : file ? (
            <p className="text-sm text-white/70">{file.name}</p>
          ) : (
            <p className="text-sm text-white/50">Click to choose a file (any format, up to 25MB)</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Description</label>
          <textarea
            className="input min-h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-white/60">Tags (comma separated)</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="digital, portrait" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Price (optional, display only)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="btn-primary w-full" disabled={submitting} type="submit">
          {submitting ? "Uploading…" : "Post artwork"}
        </button>
      </form>
    </div>
  );
}
