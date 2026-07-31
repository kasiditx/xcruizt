"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    throw new Error("Unable to sign out.");
  }

  redirect("/auth/login");
}
