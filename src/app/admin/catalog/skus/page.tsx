import { PackagePlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminSkus } from "@/modules/catalog/infrastructure/admin-sku-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export const metadata: Metadata = { title: "Admin SKUs", robots: { follow: false, index: false } };

export default async function AdminSkusPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const [rows, { notice }] = await Promise.all([listAdminSkus(), searchParams]);
  return (
    <main className="admin-page">
      <header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={{ account, status: "ready" }} /></header>
      <section className="admin-shell">
        <div className="admin-list-heading">
          <div><p className="section-kicker">ADMIN / CATALOG</p><h1>SKUs</h1><p>SKU คือสิ่งที่ขาย ราคาและ Product grants ถูกกำหนดฝั่ง Server</p></div>
          <Link className="primary-action" href="/admin/catalog/skus/new"><PackagePlus aria-hidden="true" size={17} />เพิ่ม SKU</Link>
        </div>
        {notice ? <p className="admin-notice" role="status">บันทึก SKU และ Audit Log แล้ว</p> : null}
        {rows.length === 0 ? <div className="admin-empty"><h2>ยังไม่มี SKU</h2><p>สร้าง Product จริงก่อน แล้วจึงสร้างรายการขาย</p></div> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>SKU</th><th>ราคา</th><th>Grants</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {rows.map((sku) => <tr key={sku.id}><td><strong>{sku.name}</strong><span>{sku.skuCode}</span></td><td>฿{(sku.priceSatang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td><td>{sku.productNames.join(", ")}</td><td><span className={`admin-status admin-status--${sku.status}`}>{sku.status}</span></td><td><Link aria-label={`แก้ไข ${sku.name}`} className="admin-icon-link" href={`/admin/catalog/skus/${sku.id}/edit`}><Pencil size={16} /></Link></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </main>
  );
}
