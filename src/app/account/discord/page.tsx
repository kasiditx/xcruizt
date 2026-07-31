import { MessagesSquare, RefreshCw, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  linkDiscordIdentity,
  requestDiscordResync,
} from "@/app/account/actions";
import { AccountShell } from "@/components/account/account-shell";
import { getDiscordConnectionForUser } from "@/modules/identity/infrastructure/discord-profile";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Discord",
  description: "เชื่อมบัญชี Discord และติดตามสถานะ Role Sync ของ XCRUIZT",
  robots: {
    follow: false,
    index: false,
  },
};

const notices: Record<string, string> = {
  already_queued: "มีงาน Sync รอทำอยู่แล้ว",
  customer_inactive: "บัญชีนี้ถูกระงับ จึงยังขอ Sync ไม่ได้",
  link_failed:
    "เริ่มเชื่อม Discord ไม่สำเร็จ โปรดตรวจว่าเปิด Manual Identity Linking แล้ว",
  linked: "เชื่อม Discord แล้ว ระบบกำลังจัดคิว Role Sync",
  not_linked: "ยังไม่พบบัญชี Discord ที่เชื่อมอยู่",
  queued: "ส่งคำขอ Role Sync แล้ว",
  rate_limited: "ขอ Sync บ่อยเกินไป กรุณารอประมาณ 10 นาที",
};

const syncLabels = {
  failed: "Sync ไม่สำเร็จ",
  pending: "รอ Sync",
  running: "กำลัง Sync",
  succeeded: "Sync สำเร็จ",
} as const;

export default async function DiscordAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const resolution = await getCurrentAccountResolution();

  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/account/discord");
  }
  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/account/discord");
  }

  const [{ connection, latestJob }, query] = await Promise.all([
    getDiscordConnectionForUser(resolution.account.id),
    searchParams,
  ]);
  const isLinked = Boolean(connection?.discordUserId);

  return (
    <AccountShell account={resolution.account}>
      <section
        aria-labelledby="discord-account-title"
        className="account-library account-discord"
      >
        <div className="account-library__title">
          <MessagesSquare aria-hidden="true" size={22} />
          <div>
            <p className="section-kicker">ACCOUNT / COMMUNITY</p>
            <h1 id="discord-account-title">Discord</h1>
          </div>
        </div>

        {query.notice && notices[query.notice] ? (
          <p className="account-notice" role="status">
            {notices[query.notice]}
          </p>
        ) : null}

        <div className="account-discord__grid">
          <article className="account-discord__card">
            <p className="section-kicker">CONNECTION</p>
            <h2>{isLinked ? "เชื่อมบัญชีแล้ว" : "ยังไม่ได้เชื่อมบัญชี"}</h2>
            {isLinked ? (
              <>
                <p className="account-discord__identity">
                  <ShieldCheck aria-hidden="true" size={19} />
                  {connection?.username
                    ? `@${connection.username}`
                    : "Discord account"}
                </p>
                <p>
                  Discord ใช้สำหรับ Community และ Role Sync เท่านั้น
                  สิทธิ์สินค้าอ้างอิงจาก Entitlement บนเว็บไซต์เสมอ
                </p>
              </>
            ) : (
              <>
                <p>
                  เชื่อม Discord เพื่อรับ Role ตามสินค้าที่คุณมี
                  การเชื่อมต่อไม่เปลี่ยนสิทธิ์ใน Library
                </p>
                <form action={linkDiscordIdentity}>
                  <button className="primary-action" type="submit">
                    เชื่อม Discord
                  </button>
                </form>
              </>
            )}
          </article>

          <article className="account-discord__card">
            <p className="section-kicker">ROLE SYNC</p>
            <h2>
              {latestJob
                ? syncLabels[latestJob.status]
                : "ยังไม่มีประวัติ Sync"}
            </h2>
            <p>
              {latestJob?.status === "failed"
                ? "Discord ไม่ตอบสนองหรือ Bot จัดการ Role ไม่ได้ คุณลองส่งคำขอใหม่ได้"
                : "ระบบเพิ่มหรือลบเฉพาะ Role ที่ XCRUIZT เป็นผู้ดูแลเท่านั้น"}
            </p>
            {latestJob?.completedAt ? (
              <p className="account-discord__timestamp">
                อัปเดตล่าสุด{" "}
                {latestJob.completedAt.toLocaleString("th-TH")}
              </p>
            ) : null}
            <form action={requestDiscordResync}>
              <button
                className="secondary-action"
                disabled={!isLinked}
                type="submit"
              >
                <RefreshCw aria-hidden="true" size={16} />
                ขอ Sync ใหม่
              </button>
            </form>
          </article>
        </div>
      </section>
    </AccountShell>
  );
}
