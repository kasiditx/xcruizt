import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import {
  listAdminEntitlements,
  listEntitlementGrantTargets,
} from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import {
  grantEntitlementAction,
  revokeEntitlementAction,
} from "./actions";

const notices: Record<string, string> = {
  already_active: "บัญชีนี้มี Active Entitlement ของ Product แล้ว",
  already_revoked: "Entitlement นี้ถูก Revoke ไปแล้ว",
  granted: "Grant Entitlement และบันทึก Audit Log แล้ว",
  invalid: "ข้อมูลไม่ถูกต้อง เหตุผลต้องยาวอย่างน้อย 8 ตัวอักษร",
  not_found: "ไม่พบ Customer, Product หรือ Entitlement",
  revoked: "Revoke Entitlement และบันทึก Audit Log แล้ว",
};

export default async function AdminEntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.grantEntitlement,
  );
  const [rows, targets, query] = await Promise.all([
    listAdminEntitlements(),
    listEntitlementGrantTargets(),
    searchParams,
  ]);

  return (
    <AdminOperationsShell
      account={account}
      description="Source of truth ของสิทธิ์สินค้า พร้อม source Order และสถานะ revoke"
      title="Entitlements"
    >
      {query.notice && notices[query.notice] ? (
        <AdminNotice
          message={notices[query.notice]}
          noticeCode={query.notice}
        />
      ) : null}
      <div className="admin-operation-forms">
        <AdminValidatedForm
          action={grantEntitlementAction}
          className="admin-operation-form"
        >
          <h2>Manual grant</h2>
          <label>
            <span>Customer</span>
            <select name="userId" required>
              <option value="">เลือก Customer</option>
              {targets.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  @{customer.username}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Product</span>
            <select name="productId" required>
              <option value="">เลือก Product</option>
              {targets.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Reason</span>
            <input minLength={8} name="reason" required />
          </label>
          <button className="primary-action" type="submit">
            Grant
          </button>
        </AdminValidatedForm>
        <AdminValidatedForm
          action={revokeEntitlementAction}
          className="admin-operation-form"
        >
          <h2>Manual revoke</h2>
          <label>
            <span>Active Entitlement</span>
            <select name="entitlementId" required>
              <option value="">เลือก Entitlement</option>
              {rows
                .filter(({ status }) => status === "active")
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    @{row.username} · {row.productName}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>Reason</span>
            <input minLength={8} name="reason" required />
          </label>
          <button className="admin-inline-action" type="submit">
            Revoke
          </button>
        </AdminValidatedForm>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Customer / Product</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Granted</th>
              <th scope="col">Revocation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Customer / Product">
                  <strong>@{row.username}</strong>
                  <span>{row.productName}</span>
                </td>
                <td data-label="Source">
                  {row.sourceType}
                  <span className="admin-table__subtext">
                    {row.orderNumber ?? "No Order"}
                  </span>
                </td>
                <td data-label="Status">
                  <span className={`admin-status admin-status--${row.status}`}>
                    {row.status}
                  </span>
                </td>
                <td className="admin-table__number" data-label="Granted">
                  {row.grantedAt.toLocaleString("th-TH")}
                </td>
                <td data-label="Revocation">
                  {row.revokedAt?.toLocaleString("th-TH") ?? "—"}
                  {row.revokedReason ? (
                    <span className="admin-table__subtext">
                      {row.revokedReason}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Entitlement</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
