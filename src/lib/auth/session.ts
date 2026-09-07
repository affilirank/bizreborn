import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email?: string;
  role: "admin" | "client";
}

export async function getServerSession(): Promise<{ user: SessionUser } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user: {
      id: user.id,
      email: user.email ?? undefined,
      role: profile?.role === "admin" ? "admin" : "client",
    },
  };
}
