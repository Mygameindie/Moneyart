"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { username, display_name: username } },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        await refresh();
        router.push("/");
        router.refresh();
      } else {
        setNotice("Account created! Check your email to confirm it, then log in.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("username")
          ? "That username is already taken."
          : message
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Create your account</h1>
        <p className="mb-6 text-sm text-white/60">
          Join MoneyArt to post your art, chat with fans, and get paid directly.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/60">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers and underscores only"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          {notice && <p className="text-sm text-accent2">{notice}</p>}
          <button className="btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="text-accent2 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
