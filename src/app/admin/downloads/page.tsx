import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminDownloads } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminDownloadsPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminDownloads();
  return (
    <AdminOperationsShell account={account} description="Allowed, denied และ rate-limited download activity โดยไม่แสดง IP จริง" title="Download events">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Product</th><th>Result</th><th>Created</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>@{row.username}</td><td>{row.productName}</td><td><span className={`admin-status admin-status--${row.result}`}>{row.result}</span></td><td>{row.createdAt.toLocaleString("th-TH")}</td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Download Event</p> : null}</div>
    </AdminOperationsShell>
  );
}
