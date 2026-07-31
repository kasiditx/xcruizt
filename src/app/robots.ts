import type { MetadataRoute } from "next";

import { env } from "@/lib/env/server";

export default function robots(): MetadataRoute.Robots {
  if (env.APP_ENV !== "production") {
    return { rules: { disallow: "/", userAgent: "*" } };
  }

  return {
    rules: {
      allow: "/",
      disallow: [
        "/account/",
        "/admin/",
        "/api/",
        "/auth/",
        "/cart",
        "/checkout/",
      ],
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_SITE_URL).toString(),
  };
}
