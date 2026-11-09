"use client";
import { createAuthController, githubOnly } from "@ntustray/web-authentication-component";
import { createBetterAuthAdapter } from "@ntustray/web-authentication-component/adapters/better-auth";
import { AuthProvider, AuthStatus, useAuth } from "@ntustray/web-authentication-component/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function SharedAuth({ children }: { children: ReactNode }) {
  const [controller] = useState(() => createAuthController({
    methods: githubOnly,
    adapter: createBetterAuthAdapter(authClient, {
      providers: ["github"], callbackUrl: "/", errorCallbackUrl: "/?auth_error=1", recoveryUrl: "/",
    }),
  }));
  return <AuthProvider controller={controller} locale="zh-TW"><SessionNavigation />{children}</AuthProvider>;
}

export function AccountBoundary({ userId, children }: { userId: string; children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const currentId = state.session?.user.id ?? null;
  useEffect(() => {
    if (state.status === "anonymous" || (currentId !== null && currentId !== userId)) router.refresh();
  }, [state.status, currentId, userId, router]);
  if (state.status !== "authenticated" || currentId !== userId) return <AuthStatus />;
  return children;
}

function SessionNavigation() {
  const { state } = useAuth();
  const router = useRouter();
  const last = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (state.status !== "authenticated" && state.status !== "anonymous") return;
    const id = state.session?.user.id ?? null;
    const before = last.current;
    last.current = id;
    if (before !== undefined && before !== id) router.refresh();
  }, [state.status, state.session?.user.id, router]);
  return null;
}
