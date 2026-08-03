import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminOrders } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminOrdersPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminOrders();

  return (
    <AdminOperationsShell
      account={account}
      description="Order snapshots และสถานะที่ยืนยันจาก Payment webhook"
      title="Orders"
    >
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">Created / Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Order">
                  <strong>{row.orderNumber}</strong>
                  <code className="admin-table__reference">
                    {row.providerCheckoutSessionId ?? "No Stripe Session"}
                  </code>
                </td>
                <td data-label="Customer">@{row.username}</td>
                <td className="admin-table__number" data-label="Total">
                  {(row.totalSatang / 100).toLocaleString("th-TH", {
                    currency: row.currency,
                    style: "currency",
                  })}
                </td>
                <td data-label="Status">
                  <span className={`admin-status admin-status--${row.status}`}>
                    {row.status}
                  </span>
                </td>
                <td className="admin-table__number" data-label="Created / Paid">
                  {row.createdAt.toLocaleString("th-TH")}
                  <span className="admin-table__subtext">
                    {row.paidAt
                      ? `Paid ${row.paidAt.toLocaleString("th-TH")}`
                      : "ยังไม่ Paid"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Order</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
