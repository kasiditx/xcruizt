import { Download, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { listCustomerDownloadHistory } from "@/modules/entitlements/infrastructure/download-history-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Downloads",
  description: "ประวัติการขอดาวน์โหลดไฟล์ XCRUIZT ของบัญชีนี้",
};

const resultLabels = {
  allowed: "สำเร็จ",
  denied: "ปฏิเสธ",
  file_missing: "ไม่พบไฟล์",
  rate_limited: "จำกัดการใช้งาน",
} as const;

export default async function CustomerDownloadsPage() {
  const resolution = await getCurrentAccountResolution();
  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/account/downloads");
  }
  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/account/downloads");
  }

  const history = await listCustomerDownloadHistory(resolution.account.id);

  return (
    <AccountShell account={resolution.account}>
      <section aria-labelledby="downloads-title" className="account-library">
        <div className="account-library__title">
          <History aria-hidden="true" size={22} />
          <div>
            <p className="section-kicker">ACCOUNT / ACTIVITY</p>
            <h1 id="downloads-title">Downloads</h1>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="account-empty">
            <Download aria-hidden="true" size={32} strokeWidth={1.35} />
            <h2>ยังไม่มีประวัติดาวน์โหลด</h2>
            <p>รายการดาวน์โหลดที่เกิดจากบัญชีนี้จะบันทึกโดยไม่แสดง IP หรือ signed URL</p>
            <Link className="primary-action" href="/account/library">เปิด Library</Link>
          </div>
        ) : (
          <div className="admin-table-wrap account-download-table">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>File</th><th>Result</th><th>Time</th></tr></thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td><strong>{entry.productName}</strong><span>Version {entry.version}</span></td>
                    <td>{entry.filename}<span>{entry.fileRole}</span></td>
                    <td><span className={`admin-status admin-status--${entry.result}`}>{resultLabels[entry.result]}</span></td>
                    <td>{entry.createdAt.toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
