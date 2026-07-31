import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnvironment } from "./config";

const READ_ONLY_COOKIE_ERROR = "Cookies can only be modified";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabasePublicEnvironment();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          const isReadOnlyServerComponent =
            error instanceof Error &&
            error.message.includes(READ_ONLY_COOKIE_ERROR);

          if (!isReadOnlyServerComponent) {
            throw error;
          }
        }
      },
    },
  });
}
