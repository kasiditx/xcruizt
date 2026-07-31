import { ArrowLeft, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveSafeAuthRedirect } from "@/modules/identity/application/auth-redirect";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

import { UsernameForm } from "./username-form";

export const metadata: Metadata = {
  title: "ตั้งค่า Username",
  description: "ตั้งค่า Username สำหรับบัญชี XCRUIZT",
  robots: {
    index: false,
    follow: false,
  },
};

type CompleteProfilePageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function CompleteProfilePage({
  searchParams,
}: CompleteProfilePageProps) {
  const { next } = await searchParams;
  const nextPath = resolveSafeAuthRedirect(next);
  const resolution = await getCurrentAccountResolution();

  if (resolution.status === "anonymous") {
    const completionPath = `/auth/complete-profile?next=${encodeURIComponent(
      nextPath,
    )}`;
    redirect(
      `/auth/login?next=${encodeURIComponent(completionPath)}`,
    );
  }

  if (resolution.status === "ready") {
    redirect(nextPath);
  }

  return (
    <main className="auth-page">
      <Link className="auth-back-link" href="/">
        <ArrowLeft aria-hidden="true" size={17} />
        กลับหน้าแรก
      </Link>

      <section
        aria-labelledby="complete-profile-title"
        className="auth-panel"
      >
        <div className="auth-panel__mark" aria-hidden="true">
          <UserRound size={24} strokeWidth={1.5} />
        </div>
        <p className="section-kicker">ACCOUNT / PROFILE</p>
        <h1 id="complete-profile-title">ตั้ง Username</h1>
        <p>
          เลือกชื่อที่ใช้ใน XCRUIZT หนึ่งครั้ง
          สำหรับเข้า Library และจัดการบัญชี
        </p>

        <UsernameForm nextPath={nextPath} />
      </section>
    </main>
  );
}
