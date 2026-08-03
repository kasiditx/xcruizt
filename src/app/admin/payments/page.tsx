import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminPayments } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminPaymentsPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminPayments();

  return (
    <AdminOperationsShell
      account={account}
      description="Payment Intent, Checkout Session และ provider status สำหรับ reconciliation"
      title="Payments"
    >
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--payments admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Order / Customer</th>
              <th scope="col">Provider references</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Order / Customer">
                  <strong>{row.orderNumber}</strong>
                  <span>@{row.username}</span>
                </td>
                <td data-label="Provider references">
                  <div className="admin-table__stack">
                    <code className="admin-table__reference">
                      {row.providerPaymentIntentId ?? "No Payment Intent"}
                    </code>
                    <code className="admin-table__reference">
                      {row.providerCheckoutSessionId ?? "No Session"}
                    </code>
                  </div>
                </td>
                <td className="admin-table__number" data-label="Amount">
                  {(row.amountSatang / 100).toLocaleString("th-TH", {
                    currency: row.currency,
                    style: "currency",
                  })}
                </td>
                <td data-label="Status">
                  <div className="admin-table__stack">
                    <span className={`admin-status admin-status--${row.status}`}>
                      {row.status}
                    </span>
                    <span className="admin-table__subtext">
                      {row.rawStatus ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="admin-table__number" data-label="Created">
                  {row.createdAt.toLocaleString("th-TH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Payment</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
