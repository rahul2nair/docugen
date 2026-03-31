"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Braces, ChevronDown, CreditCard, FolderOpen, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

function buildReturnPath(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AuthControls() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const userLabel = user?.email?.trim() || "Account";
  const avatarLabel = userLabel.charAt(0).toUpperCase();
  const avatarUrl = [user?.user_metadata?.avatar_url, user?.user_metadata?.picture, user?.user_metadata?.picture_url]
    .find((value) => typeof value === "string" && value.trim().length > 0);

  const sessionToken = searchParams.get("s")?.trim();
  const withSession = (path: string) => {
    if (!sessionToken || (!path.startsWith("/workspace") && path !== "/settings")) {
      return path;
    }

    return `${path}?s=${encodeURIComponent(sessionToken)}`;
  };

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return <div className="text-xs text-ink-500">Auth...</div>;
  }

  if (!user) {
    const returnTo = buildReturnPath(pathname, searchParams);
    return (
      <Link className="rounded-full border border-[#d9cabb] bg-white/80 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-white" href={`/auth?next=${encodeURIComponent(returnTo || "/dashboard")}`}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d9cabb] bg-white/88 p-1 text-sm font-semibold text-ink-900 transition hover:bg-white"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Open account menu for ${userLabel}`}
        >
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] text-sm font-bold text-white shadow-metallic">
            {typeof avatarUrl === "string" ? (
              <img alt={userLabel} className="h-full w-full object-cover" src={avatarUrl} />
            ) : (
              avatarLabel
            )}
          </span>
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#f4e7d7] text-[#7a5530] shadow-sm">
            <ChevronDown size={10} className={menuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </span>
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-72 overflow-hidden rounded-[24px] border border-[#e6d7c6] bg-[linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(248,241,232,0.98)_100%)] p-2 shadow-[0_26px_80px_rgba(51,35,19,0.18)]">
            <div className="flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/65 px-4 py-3">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] text-sm font-bold text-white shadow-metallic">
                {typeof avatarUrl === "string" ? (
                  <img alt={userLabel} className="h-full w-full object-cover" src={avatarUrl} />
                ) : (
                  avatarLabel
                )}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f6a44]">Signed in as</div>
                <div className="mt-1 truncate text-sm font-semibold text-ink-900">{userLabel}</div>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <Link
                className="flex items-start justify-between rounded-[18px] px-4 py-3 text-sm transition hover:bg-white/80"
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-start gap-3">
                  <LayoutDashboard size={16} className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-ink-800">Account home</span>
                    <span className="mt-0.5 block text-xs text-ink-500">Billing first, then saved work and advanced tools once Pro is active</span>
                  </span>
                </span>
              </Link>
              <Link
                className="flex items-start justify-between rounded-[18px] px-4 py-3 text-sm transition hover:bg-white/80"
                href="/my-files"
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-start gap-3">
                  <FolderOpen size={16} className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-ink-800">My Files</span>
                    <span className="mt-0.5 block text-xs text-ink-500">Saved generated documents for Pro and trial access</span>
                  </span>
                </span>
              </Link>
              <Link
                className="flex items-start justify-between rounded-[18px] px-4 py-3 text-sm transition hover:bg-white/80"
                href="/billing"
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-start gap-3">
                  <CreditCard size={16} className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-ink-800">Billing</span>
                    <span className="mt-0.5 block text-xs text-ink-500">Start the Pro trial, subscribe directly, or open the customer portal</span>
                  </span>
                </span>
              </Link>
              <Link
                className="flex items-start justify-between rounded-[18px] px-4 py-3 text-sm transition hover:bg-white/80"
                href={withSession("/settings")}
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-start gap-3">
                  <Settings size={16} className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-ink-800">Settings</span>
                    <span className="mt-0.5 block text-xs text-ink-500">Branding, SMTP, API access keys, and profile details</span>
                  </span>
                </span>
              </Link>
              <Link
                className="flex items-start justify-between rounded-[18px] px-4 py-3 text-sm transition hover:bg-white/80"
                href="/api-docs"
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-start gap-3">
                  <Braces size={16} className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-ink-800">API reference</span>
                    <span className="mt-0.5 block text-xs text-ink-500">Review the document endpoints and integration surface</span>
                  </span>
                </span>
              </Link>
            </div>

            <div className="mx-2 mt-2 border-t border-[#eadcc8] pt-2">
              <button
                onClick={handleSignOut}
                className="flex w-full items-start gap-3 rounded-[18px] px-4 py-3 text-left text-sm transition hover:bg-white/80"
              >
                <LogOut size={16} className="mt-0.5 text-ink-700" />
                <span>
                  <span className="block font-medium text-ink-800">Sign out</span>
                  <span className="mt-0.5 block text-xs text-ink-500">End this session and return to the public workspace</span>
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}