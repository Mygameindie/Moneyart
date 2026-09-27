"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await refresh();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Welcome back</h1>
        <p className="mb-6 text-sm text-white/60">Log in to your MoneyArt account.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/60">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button className="btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-white/60">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent2 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
