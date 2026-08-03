import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminDownloads } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminDownloadsPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminDownloads();

  return (
    <AdminOperationsShell
      account={account}
      description="Allowed, denied และ rate-limited download activity โดยไม่แสดง IP จริง"
      title="Download events"
    >
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Product</th>
              <th scope="col">Result</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Customer">@{row.username}</td>
                <td data-label="Product">{row.productName}</td>
                <td data-label="Result">
                  <span className={`admin-status admin-status--${row.result}`}>
                    {row.result}
                  </span>
                </td>
                <td className="admin-table__number" data-label="Created">
                  {row.createdAt.toLocaleString("th-TH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Download Event</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
