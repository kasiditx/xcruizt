import { randomUUID } from "node:crypto";

import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import {
  listAdminRefunds,
  listRefundablePayments,
} from "@/modules/administration/infrastructure/operations-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { createFullRefundAction } from "./actions";

const notices: Record<string, string> = {
  created: "ส่งคำขอ Full refund ไป Stripe และบันทึกผลแล้ว",
  invalid: "ข้อมูล Refund ไม่ถูกต้อง ต้องใช้ Email จริงและเหตุผลอย่างน้อย 8 ตัวอักษร",
  not_refundable: "Payment นี้ไม่อยู่ในสถานะที่ Refund ได้",
  provider_failed: "Stripe ปฏิเสธหรือประมวลผล Refund ไม่สำเร็จ",
  provider_unavailable: "ยังไม่ได้ตั้งค่า Stripe credentials",
  rate_limit_unavailable: "ระบบป้องกัน Refund ขัดข้องชั่วคราว",
  rate_limited: "ส่งคำขอ Refund บ่อยเกินไป กรุณารอแล้วลองใหม่",
};

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.refundPayment);
  const [rows, refundablePayments, query] = await Promise.all([
    listAdminRefunds(),
    listRefundablePayments(),
    searchParams,
  ]);

  return (
    <AdminOperationsShell
      account={account}
      description="Refund records และ provider status; การคืนเงินต้องทำผ่าน guarded action เท่านั้น"
      title="Refunds"
    >
      {query.notice && notices[query.notice] ? (
        <AdminNotice
          message={notices[query.notice]}
          noticeCode={query.notice}
        />
      ) : null}
      <div className="admin-operation-forms admin-operation-forms--single">
        <AdminValidatedForm
          action={createFullRefundAction}
          className="admin-operation-form"
        >
          <h2>Create full refund</h2>
          <p>
            คืนยอดเต็มผ่าน PaymentIntent เท่านั้น และจะ Revoke สิทธิ์เฉพาะเมื่อไม่มี
            Paid Order อื่นที่ยังมอบ Product เดียวกัน
          </p>
          <input name="refundRequestId" type="hidden" value={randomUUID()} />
          <label>
            <span>Successful Payment</span>
            <select name="paymentId" required>
              <option value="">เลือก Payment</option>
              {refundablePayments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.orderNumber} · @{payment.username} ·{" "}
                  {(payment.amountSatang / 100).toLocaleString("th-TH", {
                    currency: "THB",
                    style: "currency",
                  })}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Customer email for refund instructions</span>
            <input
              autoComplete="email"
              name="instructionsEmail"
              placeholder="customer@example.com"
              required
              type="email"
            />
          </label>
          <label>
            <span>Internal reason</span>
            <input minLength={8} name="reason" required />
          </label>
          <button className="primary-action" type="submit">
            Create full refund
          </button>
        </AdminValidatedForm>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">Order / Customer</th>
              <th scope="col">Provider Refund</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              <th scope="col">Reason / Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Order / Customer">
                  <strong>{row.orderNumber}</strong>
                  <span>@{row.username}</span>
                </td>
                <td data-label="Provider Refund">
                  <code className="admin-table__reference">
                    {row.providerRefundId}
                  </code>
                </td>
                <td className="admin-table__number" data-label="Amount">
                  {(row.amountSatang / 100).toLocaleString("th-TH", {
                    currency: "THB",
                    style: "currency",
                  })}
                </td>
                <td data-label="Status">
                  <span className={`admin-status admin-status--${row.status}`}>
                    {row.status}
                  </span>
                </td>
                <td data-label="Reason / Created">
                  {row.reason ?? "—"}
                  <span className="admin-table__subtext">
                    {row.createdAt.toLocaleString("th-TH")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Refund</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}
