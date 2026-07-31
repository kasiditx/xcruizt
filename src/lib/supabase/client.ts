import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "./config";

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabasePublicEnvironment();

  return createBrowserClient(url, publishableKey);
}
