"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getProfileById } from "@/lib/data";
import { PublicUser } from "@/lib/types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setUser(null);
      return;
    }
    try {
      const profile = await getProfileById(userId);
      setUser(profile);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      loadProfile(data.session?.user.id).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function refresh() {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session?.user.id);
  }

  async function logout() {
    await getSupabase().auth.signOut();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
