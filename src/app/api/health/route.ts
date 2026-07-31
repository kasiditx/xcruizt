import { NextResponse } from "next/server";

import { env } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      data: { environment: env.APP_ENV, status: "ok" },
      ok: true,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
