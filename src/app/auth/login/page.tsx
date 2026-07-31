import { ArrowLeft, LockKeyhole, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getTurnstileSiteKey } from "@/lib/env/turnstile";
import { env } from "@/lib/env/server";
import {
  resolveLoginPageRedirect,
  resolveSafeAuthRedirect,
} from "@/modules/identity/application/auth-redirect";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

import { signInWithDiscord } from "./actions";
import { PasswordAuthForm } from "./password-auth-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
  description: "เข้าสู่ระบบ XCRUIZT เพื่อดู Library และคำสั่งซื้อ",
  robots: {
    index: false,
    follow: false,
  },
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = resolveSafeAuthRedirect(next);
  const resolution = await getCurrentAccountResolution();
  const redirectPath = resolveLoginPageRedirect(
    resolution.status,
    nextPath,
  );

  if (redirectPath) {
    redirect(redirectPath);
  }

  const turnstileSiteKey = getTurnstileSiteKey();
  if (env.APP_ENV !== "local" && !turnstileSiteKey) {
    throw new Error("Turnstile site key is required outside local development.");
  }

  return (
    <main className="auth-page">
      <Link className="auth-back-link" href="/">
        <ArrowLeft aria-hidden="true" size={17} />
        กลับหน้าแรก
      </Link>

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel__mark" aria-hidden="true">
          <LockKeyhole size={24} strokeWidth={1.5} />
        </div>
        <p className="section-kicker">ACCOUNT / SECURE ACCESS</p>
        <h1 id="login-title">บัญชี XCRUIZT</h1>
        <p>
          ใช้ Username + Password หรือ Discord ได้ทั้ง Customer และ Admin
          โดยสิทธิ์ Admin จะถูกตรวจจาก Database ฝั่ง Server หลังเข้าสู่ระบบ
        </p>

        <PasswordAuthForm
          nextPath={nextPath}
          turnstileSiteKey={turnstileSiteKey}
        />

        <div className="auth-divider" aria-hidden="true">
          <span />
          หรือ
          <span />
        </div>

        <form action={signInWithDiscord}>
          <input name="next" type="hidden" value={nextPath} />
          <button className="auth-discord" type="submit">
            <MessagesSquare aria-hidden="true" size={18} />
            เข้าสู่ระบบด้วย Discord
          </button>
        </form>

        <p className="auth-terms">
          ระบบจะตรวจ Session และสิทธิ์การใช้งานจาก Server ทุกครั้ง
        </p>
      </section>
    </main>
  );
}
