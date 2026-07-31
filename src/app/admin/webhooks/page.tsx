import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminWebhookEvents } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminWebhooksPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminWebhookEvents();
  return (
    <AdminOperationsShell account={account} description="Signed provider events, retry attempts และ safe failure reason" title="Webhook events">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Provider event</th><th>Type</th><th>Status</th><th>Attempts</th><th>Received</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.provider}</strong><span>{row.providerEventId}</span></td><td>{row.eventType}</td><td><span className={`admin-status admin-status--${row.processingStatus}`}>{row.processingStatus}</span></td><td>{row.attemptCount}</td><td>{row.receivedAt.toLocaleString("th-TH")}</td><td>{row.lastError ?? (row.processedAt ? `Processed ${row.processedAt.toLocaleString("th-TH")}` : "—")}</td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Webhook Event</p> : null}</div>
    </AdminOperationsShell>
  );
}
