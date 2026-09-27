"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import Avatar from "./Avatar";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-accent">Money</span>
          <span className="text-accent2">Art</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link href="/" className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-panel2 hover:text-white">
            Explore
          </Link>
          {user && (
            <Link
              href="/upload"
              className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-panel2 hover:text-white"
            >
              Upload
            </Link>
          )}
          {user && (
            <Link
              href="/messages"
              className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-panel2 hover:text-white"
            >
              Messages
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <Link
                href={`/u/${user.username}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-panel2"
              >
                <Avatar src={user.avatarUrl} name={user.displayName} size={28} />
                <span className="hidden text-sm text-white/80 sm:inline">{user.displayName}</span>
              </Link>
              <Link href="/settings" className="btn-secondary !px-3 !py-1.5 text-xs">
                Settings
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
                className="btn-secondary !px-3 !py-1.5 text-xs"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary !px-3 !py-1.5 text-xs">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !px-3 !py-1.5 text-xs">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
