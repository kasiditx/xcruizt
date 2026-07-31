import { FilePlus2, Pencil } from "lucide-react";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
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

export default async function VersionsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const [rows, { notice }] = await Promise.all([listAdminProductVersions(), searchParams]);
  return <main className="admin-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={{ account, status: "ready" }} /></header><section className="admin-shell"><div className="admin-list-heading"><div><p className="section-kicker">ADMIN / CATALOG</p><h1>Versions</h1><p>สร้าง Draft, ผูกไฟล์ แล้วจึง Publish เป็น Current Version</p></div><Link className="primary-action" href="/admin/catalog/versions/new"><FilePlus2 size={17} />เพิ่ม Version</Link></div>
  {notice && notices[notice] ? <p className="admin-notice" role="status">{notices[notice]}</p> : null}
  {rows.length === 0 ? <div className="admin-empty"><h2>ยังไม่มี Product Version</h2><p>สร้าง Product ก่อน แล้วเพิ่ม Version Draft สำหรับไฟล์จริง</p></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product / Version</th><th>Status</th><th>Released</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.productName}</strong><span>{row.version}{row.isCurrent ? " · Current" : ""}</span></td><td><span className={`admin-status admin-status--${row.status}`}>{row.status}</span></td><td>{row.releasedAt?.toLocaleDateString("th-TH") ?? "—"}</td><td><div className="admin-row-actions">{row.status === "draft" ? <><Link aria-label={`แก้ไข ${row.version}`} className="admin-icon-link" href={`/admin/catalog/versions/${row.id}/edit`}><Pencil size={16} /></Link><form action={publishVersionAction}><input name="versionId" type="hidden" value={row.id} /><button className="admin-inline-action" type="submit">Publish</button></form></> : null}</div></td></tr>)}</tbody></table></div>}</section></main>;
}
