import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminWebhookEvents } from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export default async function AdminWebhooksPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.readOrders);
  const rows = await listAdminWebhookEvents();

  return (
    <AdminOperationsShell
      account={account}
      description="Signed provider events, retry attempts และ safe failure reason"
      title="Webhook events"
    >
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Provider event</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col">Attempts</th>
              <th scope="col">Received</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Provider event">
                  <strong>{row.provider}</strong>
                  <code className="admin-table__reference">
                    {row.providerEventId}
                  </code>
                </td>
                <td data-label="Type">{row.eventType}</td>
                <td data-label="Status">
                  <span
                    className={`admin-status admin-status--${row.processingStatus}`}
                  >
                    {row.processingStatus}
                  </span>
                </td>
                <td className="admin-table__number" data-label="Attempts">
                  {row.attemptCount}
                </td>
                <td className="admin-table__number" data-label="Received">
                  {row.receivedAt.toLocaleString("th-TH")}
                </td>
                <td data-label="Result">
                  {row.lastError ??
                    (row.processedAt
                      ? `Processed ${row.processedAt.toLocaleString("th-TH")}`
                      : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Webhook Event</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
