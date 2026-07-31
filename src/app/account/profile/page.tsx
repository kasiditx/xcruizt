import { CircleUserRound, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";
import { getCustomerProfile } from "@/modules/identity/infrastructure/profile-repository";

import { updateProfileAction } from "./actions";

export const metadata: Metadata = {
  title: "Profile",
  description: "ข้อมูลบัญชี XCRUIZT และสถานะการเชื่อมต่อ",
};

const notices = {
  invalid: "Display name ไม่ถูกต้องหรือยาวเกิน 80 ตัวอักษร",
  not_found: "ไม่พบบัญชีที่ต้องการแก้ไข",
  updated: "บันทึก Profile แล้ว",
} as const;

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const resolution = await getCurrentAccountResolution();
  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/account/profile");
  }
  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/account/profile");
  }

  const [profile, query] = await Promise.all([
    getCustomerProfile(resolution.account.id),
    searchParams,
  ]);
  if (!profile) redirect("/auth/complete-profile?next=/account/profile");

  const deliverableEmail =
    profile.emailSnapshot &&
    !profile.emailSnapshot.endsWith("@users.xcruizt.invalid")
      ? profile.emailSnapshot
      : null;

  return (
    <AccountShell account={resolution.account}>
      <section aria-labelledby="profile-title" className="account-library">
        <div className="account-library__title">
          <CircleUserRound aria-hidden="true" size={22} />
          <div>
            <p className="section-kicker">ACCOUNT / PROFILE</p>
            <h1 id="profile-title">Profile</h1>
          </div>
        </div>

        {query.notice && notices[query.notice as keyof typeof notices] ? (
          <p className="account-notice" role="status">
            {notices[query.notice as keyof typeof notices]}
          </p>
        ) : null}

        <div className="account-profile-grid">
          <form action={updateProfileAction} className="account-profile-card admin-form">
            <p className="section-kicker">PUBLIC IDENTITY</p>
            <label><span>Username</span><input disabled value={profile.username} /></label>
            <label><span>Display name</span><input defaultValue={profile.displayName ?? ""} maxLength={80} name="displayName" /></label>
            <div className="admin-form__actions"><button className="primary-action" type="submit">Save profile</button></div>
          </form>
          <dl className="account-profile-card account-profile-facts">
            <div><dt>Status</dt><dd><ShieldCheck aria-hidden="true" size={16} /> {profile.customerStatus}</dd></div>
            <div><dt>Email</dt><dd>{deliverableEmail ?? "ยังไม่มี Email สำหรับรับข้อความ"}</dd></div>
            <div><dt>Discord</dt><dd>{profile.discordUsername ? `@${profile.discordUsername}` : "ยังไม่เชื่อม"}</dd></div>
            <div><dt>Member since</dt><dd>{profile.createdAt.toLocaleDateString("th-TH")}</dd></div>
          </dl>
        </div>
      </section>
    </AccountShell>
  );
}
