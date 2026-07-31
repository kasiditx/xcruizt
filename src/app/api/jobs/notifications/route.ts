import { randomUUID } from "node:crypto";

import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

import { getQStashReceiverEnvironment } from "@/lib/env/qstash";
import { env } from "@/lib/env/server";
import { logServerError } from "@/lib/observability/logger";
import { runNextNotificationOutboxEvent } from "@/modules/notifications/infrastructure/notification-worker";

async function processNotification() {
  const requestId = randomUUID();

  try {
    const result = await runNextNotificationOutboxEvent();
    return NextResponse.json({ data: result, ok: true, requestId });
  } catch {
    logServerError("notification.worker_failed", {
      requestId,
      route: "/api/jobs/notifications",
    });
    return NextResponse.json(
      {
        error: { code: "notification_worker_failed" },
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

  const verifiedHandler = verifySignatureAppRouter(processNotification, {
    ...signingEnvironment,
    url: new URL(
      "/api/jobs/notifications",
      env.NEXT_PUBLIC_SITE_URL,
    ).toString(),
  });

  return verifiedHandler(request);
}
