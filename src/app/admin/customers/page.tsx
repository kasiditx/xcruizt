import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminCustomers } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminCustomersPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminCustomers();
  return (
    <AdminOperationsShell account={account} description="Customer profile, Discord link และจำนวน Order/Entitlement" title="Customers">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Status</th><th>Discord</th><th>Orders</th><th>Entitlements</th><th>Joined</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>@{row.username}</strong><span>{row.displayName ?? "—"}</span></td><td><span className={`admin-status admin-status--${row.customerStatus}`}>{row.customerStatus}</span></td><td>{row.discordUsername ?? "Not linked"}</td><td>{Number(row.orderCount)}</td><td>{Number(row.entitlementCount)}</td><td>{row.createdAt.toLocaleDateString("th-TH")}</td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Customer</p> : null}</div>
    </AdminOperationsShell>
  );
}
