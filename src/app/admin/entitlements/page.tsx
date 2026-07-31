import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
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
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.grantEntitlement);
  const [rows, targets, query] = await Promise.all([
    listAdminEntitlements(),
    listEntitlementGrantTargets(),
    searchParams,
  ]);
  return (
    <AdminOperationsShell account={account} description="Source of truth ของสิทธิ์สินค้า พร้อม source Order และสถานะ revoke" title="Entitlements">
      {query.notice && notices[query.notice] ? <p className="admin-notice" role="status">{notices[query.notice]}</p> : null}
      <div className="admin-operation-forms">
        <form action={grantEntitlementAction} className="admin-operation-form">
          <h2>Manual grant</h2>
          <label><span>Customer</span><select name="userId" required><option value="">เลือก Customer</option>{targets.customers.map((customer) => <option key={customer.id} value={customer.id}>@{customer.username}</option>)}</select></label>
          <label><span>Product</span><select name="productId" required><option value="">เลือก Product</option>{targets.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label><span>Reason</span><input minLength={8} name="reason" required /></label>
          <button className="primary-action" type="submit">Grant</button>
        </form>
        <form action={revokeEntitlementAction} className="admin-operation-form">
          <h2>Manual revoke</h2>
          <label><span>Active Entitlement</span><select name="entitlementId" required><option value="">เลือก Entitlement</option>{rows.filter(({ status }) => status === "active").map((row) => <option key={row.id} value={row.id}>@{row.username} · {row.productName}</option>)}</select></label>
          <label><span>Reason</span><input minLength={8} name="reason" required /></label>
          <button className="admin-inline-action" type="submit">Revoke</button>
        </form>
      </div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer / Product</th><th>Source</th><th>Status</th><th>Granted</th><th>Revocation</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>@{row.username}</strong><span>{row.productName}</span></td><td>{row.sourceType}<span>{row.orderNumber ?? "No Order"}</span></td><td><span className={`admin-status admin-status--${row.status}`}>{row.status}</span></td><td>{row.grantedAt.toLocaleString("th-TH")}</td><td>{row.revokedAt?.toLocaleString("th-TH") ?? "—"}<span>{row.revokedReason ?? ""}</span></td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-table-empty">ยังไม่มี Entitlement</p> : null}</div>
    </AdminOperationsShell>
  );
}
