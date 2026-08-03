import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { AdminFeedback, AdminNotice } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { getDiscordGuildEnvironment } from "@/lib/env/discord";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listDiscordAdministration } from "@/modules/administration/infrastructure/discord-admin-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import {
  createDiscordMappingAction,
  deactivateDiscordMappingAction,
  enqueueDiscordSyncAction,
} from "./actions";

const notices: Record<string, string> = {
  already_queued: "บัญชีนี้มีงาน Sync รออยู่แล้ว",
  created: "สร้าง Discord Role Mapping และ Audit Log แล้ว",
  deactivated: "ปิด Mapping แล้ว Role จะถูกถอดในการ Sync ครั้งถัดไป",
  duplicate: "Mapping นี้มีอยู่แล้ว",
  invalid: "ข้อมูล Discord ไม่ถูกต้อง",
  not_configured: "ยังไม่ได้ตั้งค่า DISCORD_GUILD_ID",
  not_found: "ไม่พบ Mapping",
  not_linked: "บัญชีนี้ยังไม่ได้เชื่อม Discord",
  queued: "จัดคิว Full Sync แล้ว",
  target_not_found: "ไม่พบ Product หรือ SKU ที่เลือก",
};

export default async function AdminDiscordPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.manageDiscordSync,
  );
  const query = await searchParams;

  let guildId: string | null = null;
  try {
    guildId = getDiscordGuildEnvironment().guildId;
  } catch {
    guildId = null;
  }

  const data = guildId
    ? await listDiscordAdministration(guildId)
    : { jobs: [], mappings: [], productOptions: [], skuOptions: [] };
  const canWriteMappings = account.admin.permissionCodes.includes(
    ADMIN_PERMISSIONS.writeDiscordMapping,
  );

  return (
    <AdminOperationsShell
      account={account}
      description="ดู Queue, สั่ง Full Sync และจัดการ Role Mapping โดย Bot จะแตะเฉพาะ Role ที่อยู่ใน Mapping"
      title="Discord operations"
    >
      {query.notice && notices[query.notice] ? (
        <AdminNotice
          message={notices[query.notice]}
          noticeCode={query.notice}
        />
      ) : null}
      {!guildId ? (
        <AdminFeedback
          message="ตั้งค่า DISCORD_GUILD_ID ก่อนสร้าง Mapping หรือรัน Worker"
          tone="warning"
        />
      ) : null}

      {canWriteMappings && guildId ? (
        <AdminValidatedForm
          action={createDiscordMappingAction}
          className="admin-form"
        >
          <div className="admin-list-heading">
            <div>
              <p className="section-kicker">ROLE MAPPING</p>
              <h2>เพิ่ม Mapping</h2>
            </div>
            <button className="primary-action" type="submit">
              Save mapping
            </button>
          </div>
          <div className="admin-form__grid">
            <label>
              <span>Discord Role ID</span>
              <input name="discordRoleId" required />
            </label>
            <label>
              <span>Role name</span>
              <input maxLength={100} name="discordRoleName" required />
            </label>
            <label>
              <span>Product (เลือกอย่างใดอย่างหนึ่ง)</span>
              <select defaultValue="" name="productId">
                <option value="">ไม่ใช้ Product</option>
                {data.productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>SKU (เลือกอย่างใดอย่างหนึ่ง)</span>
              <select defaultValue="" name="skuId">
                <option value="">ไม่ใช้ SKU</option>
                {data.skuOptions.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.skuCode} · {sku.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </AdminValidatedForm>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.mappings.map((mapping) => (
              <tr key={mapping.id}>
                <td data-label="Role">
                  <strong>{mapping.discordRoleName}</strong>
                  <span>{mapping.discordRoleId}</span>
                </td>
                <td data-label="Source">
                  {mapping.productName ?? mapping.skuName ?? "—"}
                </td>
                <td data-label="Status">
                  <span
                    className={`admin-status admin-status--${mapping.isActive ? "active" : "inactive"}`}
                  >
                    {mapping.isActive ? "active" : "inactive"}
                  </span>
                </td>
                <td data-label="Action">
                  {canWriteMappings && mapping.isActive ? (
                    <form action={deactivateDiscordMappingAction}>
                      <input
                        name="mappingId"
                        type="hidden"
                        value={mapping.id}
                      />
                      <button className="admin-inline-action" type="submit">
                        Deactivate
                      </button>
                    </form>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.mappings.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Discord Role Mapping</p>
        ) : null}
      </div>

      <div className="admin-list-heading">
        <div>
          <p className="section-kicker">RECENT QUEUE</p>
          <h2>Discord Sync jobs</h2>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Status</th>
              <th scope="col">Attempts</th>
              <th scope="col">Result</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((job) => (
              <tr key={job.id}>
                <td data-label="Customer">
                  <strong>@{job.username}</strong>
                  <span>{job.createdAt.toLocaleString("th-TH")}</span>
                </td>
                <td data-label="Status">
                  <span className={`admin-status admin-status--${job.status}`}>
                    {job.status}
                  </span>
                </td>
                <td className="admin-table__number" data-label="Attempts">
                  {job.attemptCount}
                </td>
                <td data-label="Result">
                  {job.lastError ?? (job.completedAt ? "completed" : "—")}
                </td>
                <td data-label="Action">
                  <form action={enqueueDiscordSyncAction}>
                    <input name="userId" type="hidden" value={job.userId} />
                    <button className="admin-inline-action" type="submit">
                      Full resync
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.jobs.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Discord Sync Job</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
