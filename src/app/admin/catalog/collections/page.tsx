import { FolderPlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { filterAdminRows } from "@/modules/administration/application/admin-list-filter";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminCollections } from "@/modules/catalog/infrastructure/admin-collection-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export const metadata: Metadata = {
  title: "Admin Collections",
  robots: {
    index: false,
    follow: false,
  },
};

type CollectionsPageProps = {
  searchParams: Promise<{ notice?: string; q?: string; status?: string }>;
};

const notices: Record<string, string> = {
  created: "สร้าง Collection และบันทึก Audit Log แล้ว",
  updated: "อัปเดต Collection และบันทึก Audit Log แล้ว",
};

export default async function AdminCollectionsPage({
  searchParams,
}: CollectionsPageProps) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const [collectionRows, query] = await Promise.all([
    listAdminCollections(),
    searchParams,
  ]);
  const visibleCollections = filterAdminRows({
    getSearchText: (collection) =>
      `${collection.name} ${collection.slug} ${collection.tagline ?? ""}`,
    getStatus: (collection) => collection.status,
    query: query.q,
    rows: collectionRows,
    status: query.status,
  });

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls
          resolution={{ account, status: "ready" }}
        />
      </header>

      <section className="admin-shell" aria-labelledby="collections-title">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / CATALOG</p>
            <h1 id="collections-title">Collections</h1>
            <p>
              จัดกลุ่ม Product และควบคุมสถานะเผยแพร่จากฐานข้อมูลจริง
            </p>
          </div>
          <Link
            className="primary-action"
            href="/admin/catalog/collections/new"
          >
            <FolderPlus aria-hidden="true" size={17} />
            เพิ่ม Collection
          </Link>
        </div>

        {query.notice && notices[query.notice] ? (
          <AdminNotice
            message={notices[query.notice]}
            noticeCode={query.notice}
          />
        ) : null}

        <AdminListToolbar
          action="/admin/catalog/collections"
          query={query.q}
          resultCount={visibleCollections.length}
          status={query.status}
          statusOptions={[
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" },
            { label: "Archived", value: "archived" },
          ]}
        />

        {visibleCollections.length === 0 ? (
          <div className="admin-empty">
            <h2>{collectionRows.length === 0 ? "ยังไม่มี Collection" : "ไม่พบ Collection"}</h2>
            <p>
              {collectionRows.length === 0
                ? "สร้าง Collection แรกก่อนเพิ่ม Product และ SKU ระบบจะไม่สร้างข้อมูลตัวอย่างให้อัตโนมัติ"
                : "ลองเปลี่ยนคำค้นหาหรือสถานะ แล้วแสดงผลอีกครั้ง"}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--catalog">
              <thead>
                <tr>
                  <th scope="col">Collection</th>
                  <th scope="col">Status</th>
                  <th scope="col">Sort</th>
                  <th scope="col">Updated</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleCollections.map((collection) => (
                  <tr key={collection.id}>
                    <td data-label="Collection">
                      <Link
                        className="admin-table__primary-link"
                        href={`/admin/catalog/collections/${collection.id}/edit`}
                      >
                        <strong>{collection.name}</strong>
                        <span>/{collection.slug}</span>
                      </Link>
                    </td>
                    <td data-label="Status">
                      <span
                        className={`admin-status admin-status--${collection.status}`}
                      >
                        {collection.status}
                      </span>
                    </td>
                    <td data-label="Sort">{collection.sortOrder}</td>
                    <td data-label="Updated">
                      {collection.updatedAt.toLocaleDateString("th-TH")}
                    </td>
                    <td data-label="Actions">
                      <Link
                        aria-label={`แก้ไข ${collection.name}`}
                        className="admin-table-action"
                        href={`/admin/catalog/collections/${collection.id}/edit`}
                      >
                        <Pencil aria-hidden="true" size={16} />
                        <span>แก้ไข</span>
                      </Link>
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
