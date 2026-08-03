import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminCustomers } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminCustomersPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminCustomers();

  return (
    <AdminOperationsShell
      account={account}
      description="Customer profile, Discord link และจำนวน Order/Entitlement"
      title="Customers"
    >
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Status</th>
              <th scope="col">Discord</th>
              <th scope="col">Orders</th>
              <th scope="col">Entitlements</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Customer">
                  <strong>@{row.username}</strong>
                  <span>{row.displayName ?? "—"}</span>
                </td>
                <td data-label="Status">
                  <span
                    className={`admin-status admin-status--${row.customerStatus}`}
                  >
                    {row.customerStatus}
                  </span>
                </td>
                <td data-label="Discord">{row.discordUsername ?? "Not linked"}</td>
                <td className="admin-table__number" data-label="Orders">
                  {Number(row.orderCount)}
                </td>
                <td className="admin-table__number" data-label="Entitlements">
                  {Number(row.entitlementCount)}
                </td>
                <td className="admin-table__number" data-label="Joined">
                  {row.createdAt.toLocaleDateString("th-TH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Customer</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
