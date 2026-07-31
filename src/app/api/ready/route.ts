import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { env } from "@/lib/env/server";
import { logServerError } from "@/lib/observability/logger";
import { inspectReadinessConfiguration } from "@/lib/observability/readiness-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = randomUUID();
  const configuration = inspectReadinessConfiguration(
    env.APP_ENV,
    process.env,
  );

  if (configuration.blocking.length > 0) {
    logServerError("readiness.configuration_failed", {
      failureCount: configuration.blocking.length,
      requestId,
      route: "/api/ready",
    });
    return NextResponse.json(
      {
        error: { code: "configuration_incomplete" },
        ok: false,
        requestId,
      },
      { headers: { "cache-control": "no-store" }, status: 503 },
    );
  }

  try {
    await db.execute(sql`select 1 as ready`);
    return NextResponse.json(
      { data: { status: "ready" }, ok: true, requestId },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    logServerError("readiness.database_failed", {
      requestId,
      route: "/api/ready",
    });
    return NextResponse.json(
      {
        error: { code: "database_unavailable" },
        ok: false,
        requestId,
      },
      { headers: { "cache-control": "no-store" }, status: 503 },
    );
  }
}
