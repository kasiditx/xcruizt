import { ArrowLeft, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { findCustomerOrderByNumber } from "@/modules/checkout/infrastructure/customer-order-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Order detail",
  description: "รายละเอียดคำสั่งซื้อ XCRUIZT ของบัญชีนี้",
};

const statusLabels = {
  cancelled: "ยกเลิกแล้ว",
  expired: "หมดเวลา",
  failed: "ชำระไม่สำเร็จ",
  paid: "ชำระแล้ว",
  partially_refunded: "คืนเงินบางส่วน",
  pending: "รอชำระ",
  processing: "กำลังตรวจสอบ",
  refunded: "คืนเงินแล้ว",
} as const;

function formatMoney(amountSatang: number, currency: string) {
  return new Intl.NumberFormat("th-TH", {
    currency,
    style: "currency",
  }).format(amountSatang / 100);
}

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const resolution = await getCurrentAccountResolution();
  const nextPath = `/account/orders/${encodeURIComponent(orderNumber)}`;

  if (resolution.status === "anonymous") {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (resolution.status === "profile_required") {
    redirect(`/auth/complete-profile?next=${encodeURIComponent(nextPath)}`);
  }

  const order = await findCustomerOrderByNumber(
    resolution.account.id,
    orderNumber,
  );
  if (!order) notFound();

  return (
    <AccountShell account={resolution.account}>
      <section aria-labelledby="order-title" className="account-library">
        <Link className="account-back-link" href="/account/orders">
          <ArrowLeft aria-hidden="true" size={16} />
          กลับไป Orders
        </Link>
        <div className="account-library__title">
          <ReceiptText aria-hidden="true" size={22} />
          <div>
            <p className="section-kicker">{order.orderNumber}</p>
            <h1 id="order-title">Order</h1>
          </div>
        </div>

        <div className="account-order-detail">
          <dl className="account-order-detail__meta">
            <div><dt>Status</dt><dd>{statusLabels[order.status]}</dd></div>
            <div><dt>Created</dt><dd>{order.createdAt.toLocaleString("th-TH")}</dd></div>
            <div><dt>Paid</dt><dd>{order.paidAt?.toLocaleString("th-TH") ?? "—"}</dd></div>
          </dl>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Item</th><th>Quantity</th><th>Total</th></tr></thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.productName}</strong><span>{item.skuCode}</span></td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.lineTotalSatang, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="account-order-detail__totals">
            <div><dt>Subtotal</dt><dd>{formatMoney(order.subtotalSatang, order.currency)}</dd></div>
            <div><dt>Discount</dt><dd>−{formatMoney(order.discountSatang, order.currency)}</dd></div>
            <div><dt>Total</dt><dd>{formatMoney(order.totalSatang, order.currency)}</dd></div>
          </dl>
        </div>
      </section>
    </AccountShell>
  );
}
