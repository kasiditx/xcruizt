import { Library, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { DownloadButton } from "@/components/account/download-button";
import {
  getLibraryDownloadFilesForUser,
  getLibraryItemsForUser,
} from "@/modules/entitlements/infrastructure/library-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

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

  const [libraryItems, downloadFiles] = await Promise.all([
    getLibraryItemsForUser(resolution.account.id),
    getLibraryDownloadFilesForUser(resolution.account.id),
  ]);
  const fileRoleLabels = {
    checksum: "Checksum",
    extra: "ไฟล์เสริม",
    guide: "คู่มือติดตั้ง",
    installer: "Installer",
    main_package: "ดาวน์โหลด Preset",
  } as const;
  const downloadFilesByProduct = new Map<
    string,
    typeof downloadFiles
  >();
  for (const file of downloadFiles) {
    const productFiles =
      downloadFilesByProduct.get(file.productId) ?? [];
    productFiles.push(file);
    downloadFilesByProduct.set(file.productId, productFiles);
  }

  return (
    <AccountShell account={resolution.account}>
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

        {libraryItems.length === 0 ? (
          <div className="account-empty">
            <PackageOpen aria-hidden="true" size={32} strokeWidth={1.35} />
            <h2>ยังไม่มี Preset ใน Library</h2>
            <p>
              บัญชีนี้ยังไม่มี Active Entitlement
              สินค้าที่ชำระสำเร็จและผ่านการยืนยันจาก Stripe webhook
              จะปรากฏที่นี่
            </p>
            <Link className="primary-action" href="/#collections">
              ดู Preset ทั้งหมด
            </Link>
          </div>
        ) : (
          <ul className="library-grid" aria-label="Preset ที่เป็นเจ้าของ">
            {libraryItems.map((item) => (
              <li className="library-card" key={item.entitlementId}>
                <div className="library-card__topline">
                  <span>{item.collectionName ?? "XCRUIZT"}</span>
                  <span className="library-card__status">Active</span>
                </div>
                <h2>{item.productName}</h2>
                <p>{item.shortDescription}</p>
                <dl>
                  <div>
                    <dt>Version</dt>
                    <dd>{item.version ?? "รอ Published Version"}</dd>
                  </div>
                  <div>
                    <dt>ได้รับสิทธิ์</dt>
                    <dd>
                      {item.grantedAt.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>
                <div
                  aria-label={`ไฟล์ของ ${item.productName}`}
                  className="library-card__downloads"
                >
                  {(downloadFilesByProduct.get(item.productId) ?? []).map(
                    (file) => (
                      <DownloadButton
                        fileId={file.fileId}
                        filename={file.originalFilename}
                        key={file.fileId}
                        label={fileRoleLabels[file.fileRole]}
                        productId={item.productId}
                      />
                    ),
                  )}
                  {!downloadFilesByProduct.has(item.productId) ? (
                    <p className="library-card__files-pending">
                      ยังไม่มี Active file ในเวอร์ชันนี้
                    </p>
                  ) : null}
                </div>
                {item.changelogMd ? (
                  <details className="library-card__changelog">
                    <summary>Changelog {item.version}</summary>
                    <pre>{item.changelogMd}</pre>
                    {item.releaseNotesMd ? (
                      <p>{item.releaseNotesMd}</p>
                    ) : null}
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountShell>
  );
}
