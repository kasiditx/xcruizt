import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminAuditLogs } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminAuditLogsPage() {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.manageAdminRoles,
  );
  const rows = await listAdminAuditLogs();

  return (
    <AdminOperationsShell
      account={account}
      description="ประวัติ Admin mutation ที่ระบุ actor, action และ entity"
      title="Audit logs"
    >
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Entity</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Actor">
                  @{row.adminUsername ?? "unknown-admin"}
                </td>
                <td data-label="Action">
                  <code className="admin-table__reference">{row.action}</code>
                </td>
                <td data-label="Entity">
                  {row.entityType}
                  <code className="admin-table__reference">{row.entityId}</code>
                </td>
                <td className="admin-table__number" data-label="Created">
                  {row.createdAt.toLocaleString("th-TH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Audit Log</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
