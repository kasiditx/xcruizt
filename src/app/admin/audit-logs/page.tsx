import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminAuditLogs } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminAuditLogsPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.manageAdminRoles);
  const rows = await listAdminAuditLogs();
  return (
    <AdminOperationsShell account={account} description="ประวัติ Admin mutation ที่ระบุ actor, action และ entity" title="Audit logs">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Created</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>@{row.adminUsername ?? "unknown-admin"}</td><td><code>{row.action}</code></td><td>{row.entityType}<span>{row.entityId}</span></td><td>{row.createdAt.toLocaleString("th-TH")}</td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Audit Log</p> : null}</div>
    </AdminOperationsShell>
  );
}
