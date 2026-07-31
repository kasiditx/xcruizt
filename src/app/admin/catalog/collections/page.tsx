import { FolderPlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
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
  searchParams: Promise<{ notice?: string }>;
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
  const [collectionRows, { notice }] = await Promise.all([
    listAdminCollections(),
    searchParams,
  ]);

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

        {notice && notices[notice] ? (
          <p className="admin-notice" role="status">
            {notices[notice]}
          </p>
        ) : null}

        {collectionRows.length === 0 ? (
          <div className="admin-empty">
            <h2>ยังไม่มี Collection</h2>
            <p>
              สร้าง Collection แรกก่อนเพิ่ม Product และ SKU
              ระบบจะไม่สร้างข้อมูลตัวอย่างให้อัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                {collectionRows.map((collection) => (
                  <tr key={collection.id}>
                    <td>
                      <strong>{collection.name}</strong>
                      <span>/{collection.slug}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-status admin-status--${collection.status}`}
                      >
                        {collection.status}
                      </span>
                    </td>
                    <td>{collection.sortOrder}</td>
                    <td>
                      {collection.updatedAt.toLocaleDateString("th-TH")}
                    </td>
                    <td>
                      <Link
                        aria-label={`แก้ไข ${collection.name}`}
                        className="admin-icon-link"
                        href={`/admin/catalog/collections/${collection.id}/edit`}
                      >
                        <Pencil aria-hidden="true" size={16} />
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
