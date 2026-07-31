import { randomUUID } from "node:crypto";

import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

import { getDiscordBotEnvironment } from "@/lib/env/discord";
import { getQStashReceiverEnvironment } from "@/lib/env/qstash";
import { env } from "@/lib/env/server";
import { logServerError } from "@/lib/observability/logger";
import { runNextDiscordSyncJob } from "@/modules/discord/infrastructure/discord-worker";

async function processDiscordJob() {
  const requestId = randomUUID();

  let discordEnvironment: ReturnType<typeof getDiscordBotEnvironment>;
  try {
    discordEnvironment = getDiscordBotEnvironment();
  } catch {
    return NextResponse.json(
      {
        error: { code: "discord_provider_not_configured" },
        ok: false,
        requestId,
      },
      { status: 503 },
    );
  }

  try {
    const result = await runNextDiscordSyncJob(discordEnvironment);
    return NextResponse.json({ data: result, ok: true, requestId });
  } catch {
    logServerError("discord.worker_failed", {
      requestId,
      route: "/api/jobs/discord",
    });
    return NextResponse.json(
      {
        error: { code: "discord_worker_failed" },
        ok: false,
        requestId,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let signingEnvironment: ReturnType<
    typeof getQStashReceiverEnvironment
  >;
  try {
    signingEnvironment = getQStashReceiverEnvironment();
  } catch {
    return NextResponse.json(
      {
        error: { code: "job_receiver_not_configured" },
        ok: false,
        requestId: randomUUID(),
      },
      { status: 503 },
    );
  }

  const verifiedHandler = verifySignatureAppRouter(processDiscordJob, {
    ...signingEnvironment,
    url: new URL("/api/jobs/discord", env.NEXT_PUBLIC_SITE_URL).toString(),
  });

  return verifiedHandler(request);
}
