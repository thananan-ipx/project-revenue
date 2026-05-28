"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AuthForm } from "./auth-form";

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * AuthGate logic:
 * - Loading → spinner
 * - Supabase configured + no user → AuthForm
 * - Supabase not configured (local-only mode) → render app (no auth needed)
 * - User logged in → render app
 */
export function AuthGate({ children }: AuthGateProps) {
  const { loading, user, mode } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground animate-bounce">
          <span className="text-xl font-bold">฿</span>
        </div>
        <div className="text-sm font-semibold tracking-wider animate-pulse">กำลังเชื่อมต่อระบบ...</div>
      </div>
    );
  }

  // Supabase configured + ไม่ login → AuthForm
  if (isSupabaseConfigured() && !user && mode !== "supabase") {
    return <AuthForm />;
  }

  return <>{children}</>;
}
