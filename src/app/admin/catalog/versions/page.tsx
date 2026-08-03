import { FilePlus2, Pencil } from "lucide-react";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { filterAdminRows } from "@/modules/administration/application/admin-list-filter";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminProductVersions } from "@/modules/catalog/infrastructure/admin-product-version-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { publishVersionAction } from "./actions";

const notices: Record<string, string> = {
  active_main_package_required: "Publish ไม่ได้: ต้องมีไฟล์ main_package ที่ Active ก่อน",
  created: "สร้าง Version Draft และ Audit Log แล้ว",
  immutable: "Version นี้ Published หรือ Deprecated แล้ว",
  product_not_published: "Publish ไม่ได้: Product ต้อง Published ก่อน",
  published: "Publish และตั้ง Current Version แล้ว",
  updated: "อัปเดต Version Draft แล้ว",
};

export default async function VersionsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; q?: string; status?: string }>;
}) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const [rows, query] = await Promise.all([
    listAdminProductVersions(),
    searchParams,
  ]);
  const visibleRows = filterAdminRows({
    getSearchText: (row) => `${row.productName} ${row.version}`,
    getStatus: (row) => row.status,
    query: query.q,
    rows,
    status: query.status,
  });

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section className="admin-shell">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / CATALOG</p>
            <h1>Versions</h1>
            <p>สร้าง Draft, ผูกไฟล์ แล้ว Publish เป็น Current Version</p>
          </div>
          <Link className="primary-action" href="/admin/catalog/versions/new">
            <FilePlus2 aria-hidden="true" size={17} />
            เพิ่ม Version
          </Link>
        </div>

        {query.notice && notices[query.notice] ? (
          <AdminNotice
            message={notices[query.notice]}
            noticeCode={query.notice}
          />
        ) : null}

        <AdminListToolbar
          action="/admin/catalog/versions"
          query={query.q}
          resultCount={visibleRows.length}
          status={query.status}
          statusOptions={[
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" },
            { label: "Deprecated", value: "deprecated" },
          ]}
        />

        {visibleRows.length === 0 ? (
          <div className="admin-empty">
            <h2>{rows.length === 0 ? "ยังไม่มี Product Version" : "ไม่พบ Version"}</h2>
            <p>
              {rows.length === 0
                ? "สร้าง Product ก่อน แล้วเพิ่ม Version Draft สำหรับไฟล์จริง"
                : "ลองเปลี่ยนคำค้นหาหรือสถานะ แล้วแสดงผลอีกครั้ง"}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--catalog">
              <thead>
                <tr>
                  <th scope="col">Product / Version</th>
                  <th scope="col">Status</th>
                  <th scope="col">Released</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Product / Version">
                      {row.status === "draft" ? (
                        <Link
                          className="admin-table__primary-link"
                          href={`/admin/catalog/versions/${row.id}/edit`}
                        >
                          <strong>{row.productName}</strong>
                          <span>{row.version}{row.isCurrent ? " · Current" : ""}</span>
                        </Link>
                      ) : (
                        <>
                          <strong>{row.productName}</strong>
                          <span>{row.version}{row.isCurrent ? " · Current" : ""}</span>
                        </>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`admin-status admin-status--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td data-label="Released">
                      {row.releasedAt?.toLocaleDateString("th-TH") ?? "—"}
                    </td>
                    <td data-label="Actions">
                      <div className="admin-row-actions">
                        {row.status === "draft" ? (
                          <>
                            <Link
                              aria-label={`แก้ไข ${row.version}`}
                              className="admin-table-action"
                              href={`/admin/catalog/versions/${row.id}/edit`}
                            >
                              <Pencil aria-hidden="true" size={16} />
                              <span>แก้ไข</span>
                            </Link>
                            <form action={publishVersionAction}>
                              <input name="versionId" type="hidden" value={row.id} />
                              <button className="admin-inline-action" type="submit">
                                Publish
                              </button>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
