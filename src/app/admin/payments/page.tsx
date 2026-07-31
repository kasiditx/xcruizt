import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminPayments } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminPaymentsPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminPayments();
  return (
    <AdminOperationsShell account={account} description="Payment Intent, Checkout Session และ provider status สำหรับ reconciliation" title="Payments">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order / Customer</th><th>Provider references</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.orderNumber}</strong><span>@{row.username}</span></td><td>{row.providerPaymentIntentId ?? "No Payment Intent"}<span>{row.providerCheckoutSessionId ?? "No Session"}</span></td><td>{(row.amountSatang / 100).toLocaleString("th-TH", { style: "currency", currency: row.currency })}</td><td><span className={`admin-status admin-status--${row.status}`}>{row.status}</span><span>{row.rawStatus ?? "—"}</span></td><td>{row.createdAt.toLocaleString("th-TH")}</td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Payment</p> : null}</div>
    </AdminOperationsShell>
  );
}
