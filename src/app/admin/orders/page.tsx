import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminOrders } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminOrdersPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminOrders();
  return (
    <AdminOperationsShell account={account} description="Order snapshots และสถานะที่ยืนยันจาก Payment webhook" title="Orders">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Created / Paid</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.orderNumber}</strong><span>{row.providerCheckoutSessionId ?? "No Stripe Session"}</span></td><td>{row.username}</td><td>{(row.totalSatang / 100).toLocaleString("th-TH", { style: "currency", currency: row.currency })}</td><td><span className={`admin-status admin-status--${row.status}`}>{row.status}</span></td><td>{row.createdAt.toLocaleString("th-TH")}<span>{row.paidAt ? `Paid ${row.paidAt.toLocaleString("th-TH")}` : "ยังไม่ Paid"}</span></td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Order</p> : null}</div>
    </AdminOperationsShell>
  );
}
