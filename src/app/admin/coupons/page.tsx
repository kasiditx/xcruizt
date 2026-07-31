import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminCoupons } from "@/modules/administration/infrastructure/coupon-admin-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import {
  createCouponAction,
  updateCouponStatusAction,
} from "./actions";

const notices: Record<string, string> = {
  created: "สร้าง Coupon แบบ Draft และบันทึก Audit Log แล้ว",
  duplicate: "Coupon code นี้มีอยู่แล้ว",
  invalid: "ข้อมูล Coupon ไม่ถูกต้อง",
  invalid_transition: "Coupon ที่หมดอายุแล้วไม่สามารถ Activate ได้",
  not_found: "ไม่พบ Coupon",
  updated: "อัปเดตสถานะ Coupon แล้ว",
};

function formatDiscount(type: "fixed" | "percent", value: number) {
  if (type === "percent") return `${value}%`;
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    style: "currency",
  }).format(value / 100);
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeCoupon,
  );
  const [couponRows, query] = await Promise.all([
    listAdminCoupons(),
    searchParams,
  ]);

  return (
    <AdminOperationsShell
      account={account}
      description="สร้าง Coupon จากค่าที่ Server ตรวจสอบ และเปลี่ยนสถานะพร้อม Audit Log"
      title="Coupons"
    >
      {query.notice && notices[query.notice] ? (
        <p className="admin-notice" role="status">
          {notices[query.notice]}
        </p>
      ) : null}

      <form action={createCouponAction} className="admin-form">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">PRICING / CREATE</p>
            <h2>New coupon</h2>
          </div>
        </div>
        <div className="admin-form__grid">
          <label>
            <span>Code</span>
            <input
              autoCapitalize="characters"
              maxLength={32}
              name="code"
              pattern="[A-Za-z0-9_-]{3,32}"
              required
            />
          </label>
          <label>
            <span>Discount type</span>
            <select defaultValue="percent" name="discountType">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed THB</option>
            </select>
          </label>
          <label>
            <span>Discount value (% หรือ THB ตาม type)</span>
            <input min="0.01" name="discountValue" required step="0.01" type="number" />
          </label>
          <label>
            <span>Minimum cart (THB, optional)</span>
            <input min="0" name="minimumAmount" step="0.01" type="number" />
          </label>
          <label>
            <span>Maximum discount (THB, optional)</span>
            <input min="0" name="maximumDiscount" step="0.01" type="number" />
          </label>
          <label>
            <span>Global usage limit</span>
            <input min="1" name="usageLimit" step="1" type="number" />
          </label>
          <label>
            <span>Per-user limit</span>
            <input min="1" name="perUserLimit" step="1" type="number" />
          </label>
          <label>
            <span>Starts at (เวลาไทย)</span>
            <input name="startsAt" required type="datetime-local" />
          </label>
          <label>
            <span>Ends at (เวลาไทย)</span>
            <input name="endsAt" required type="datetime-local" />
          </label>
        </div>
        <div className="admin-form__actions">
          <button className="primary-action" type="submit">
            Create draft
          </button>
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Window</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {couponRows.map((coupon) => (
              <tr key={coupon.id}>
                <td><strong>{coupon.code}</strong></td>
                <td>{formatDiscount(coupon.discountType, coupon.discountValue)}</td>
                <td>
                  <span>{coupon.startsAt.toLocaleString("th-TH")}</span>
                  <span>ถึง {coupon.endsAt.toLocaleString("th-TH")}</span>
                </td>
                <td>
                  {coupon.redemptionCount}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / ∞"}
                  {coupon.perUserLimit ? ` · user ${coupon.perUserLimit}` : ""}
                </td>
                <td>
                  <span className={`admin-status admin-status--${coupon.status}`}>
                    {coupon.status}
                  </span>
                </td>
                <td>
                  <div className="admin-inline-actions">
                    {coupon.status !== "active" ? (
                      <form action={updateCouponStatusAction}>
                        <input name="couponId" type="hidden" value={coupon.id} />
                        <input name="status" type="hidden" value="active" />
                        <button className="admin-inline-action" type="submit">Activate</button>
                      </form>
                    ) : (
                      <form action={updateCouponStatusAction}>
                        <input name="couponId" type="hidden" value={coupon.id} />
                        <input name="status" type="hidden" value="paused" />
                        <button className="admin-inline-action" type="submit">Pause</button>
                      </form>
                    )}
                    {coupon.status !== "expired" ? (
                      <form action={updateCouponStatusAction}>
                        <input name="couponId" type="hidden" value={coupon.id} />
                        <input name="status" type="hidden" value="expired" />
                        <button className="admin-inline-action" type="submit">Expire</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {couponRows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Coupon</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
