import { PackageOpen, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { listCustomerOrders } from "@/modules/checkout/infrastructure/customer-order-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Orders",
  description: "ประวัติคำสั่งซื้อ XCRUIZT ของบัญชีนี้",
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

export default async function CustomerOrdersPage() {
  const resolution = await getCurrentAccountResolution();
  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/account/orders");
  }
  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/account/orders");
  }

  const orderRows = await listCustomerOrders(resolution.account.id);

  return (
    <AccountShell account={resolution.account}>
      <section aria-labelledby="orders-title" className="account-library">
        <div className="account-library__title">
          <ReceiptText aria-hidden="true" size={22} />
          <div>
            <p className="section-kicker">ACCOUNT / PURCHASE HISTORY</p>
            <h1 id="orders-title">Orders</h1>
          </div>
        </div>

        {orderRows.length === 0 ? (
          <div className="account-empty">
            <PackageOpen aria-hidden="true" size={32} strokeWidth={1.35} />
            <h2>ยังไม่มีคำสั่งซื้อ</h2>
            <p>คำสั่งซื้อที่สร้างจาก Checkout ของบัญชีนี้จะปรากฏที่นี่</p>
            <Link className="primary-action" href="/shop">
              ดู Preset
            </Link>
          </div>
        ) : (
          <ul aria-label="คำสั่งซื้อ" className="account-order-list">
            {orderRows.map((order) => (
              <li key={order.id}>
                <div>
                  <p className="section-kicker">{order.orderNumber}</p>
                  <h2>
                    {order.items
                      .map((item) => item.productName)
                      .join(", ") || "Order"}
                  </h2>
                  <p>
                    {order.createdAt.toLocaleString("th-TH")} · {statusLabels[order.status]}
                  </p>
                </div>
                <div className="account-order-list__summary">
                  <strong>{formatMoney(order.totalSatang, order.currency)}</strong>
                  <Link href={`/account/orders/${order.orderNumber}`}>ดูรายละเอียด</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountShell>
  );
}
