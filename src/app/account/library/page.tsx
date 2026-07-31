import { Library, LogOut, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

import { signOut } from "../actions";

export const metadata: Metadata = {
  title: "Library",
  description: "คลัง ReShade presets ที่คุณเป็นเจ้าของบน XCRUIZT",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LibraryPage() {
  const resolution = await getCurrentAccountResolution();

  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/account/library");
  }

  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/account/library");
  }

  return (
    <main className="account-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <div className="account-identity">
          <p>@{resolution.account.username}</p>
          <form action={signOut}>
            <button className="account-signout" type="submit">
              <LogOut aria-hidden="true" size={15} />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>

      <section
        aria-labelledby="library-title"
        className="account-library"
      >
        <div className="account-library__title">
          <Library aria-hidden="true" size={22} />
          <div>
            <p className="section-kicker">ACCOUNT / OWNED PRESETS</p>
            <h1 id="library-title">Library</h1>
          </div>
        </div>

        <div className="account-empty">
          <PackageOpen aria-hidden="true" size={32} strokeWidth={1.35} />
          <h2>ยังไม่มี Preset ใน Library</h2>
          <p>
            Preset ที่ชำระผ่าน PromptPay สำเร็จจะปรากฏที่นี่
            หลังระบบยืนยัน Stripe webhook
          </p>
          <Link className="primary-action" href="/#collections">
            ดู Preset ทั้งหมด
          </Link>
        </div>
      </section>
    </main>
  );
}
