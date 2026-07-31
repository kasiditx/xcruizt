import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnvironment } from "./config";

function hasSupabaseConfiguration(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function refreshSupabaseSession(request: NextRequest) {
  if (!hasSupabaseConfiguration()) {
    if ((process.env.APP_ENV ?? "local") !== "local") {
      throw new Error("Supabase Auth environment is not configured.");
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabasePublicEnvironment();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}
