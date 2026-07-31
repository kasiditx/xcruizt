import { CircleCheck, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AccountControls } from "@/components/account/account-controls";
import { formatThaiBaht } from "@/modules/catalog/application/price";
import { findCheckoutResultForUser } from "@/modules/checkout/infrastructure/order-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Checkout Status",
  robots: { follow: false, index: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const resolution = await getCurrentAccountResolution();
  if (resolution.status !== "ready") {
    redirect("/auth/login?next=/checkout/success");
  }
  const { session_id: sessionId } = await searchParams;
  const validSessionId = z
    .string()
    .regex(/^cs_(?:test|live)_[A-Za-z0-9]+$/)
    .safeParse(sessionId);
  const order = validSessionId.success
    ? await findCheckoutResultForUser(
        resolution.account.id,
        validSessionId.data,
      )
    : null;

  const paid = order?.status === "paid";
  return <main className="store-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={resolution} /></header><section className="checkout-state">{paid ? <CircleCheck aria-hidden="true" /> : <Clock3 aria-hidden="true" />}<p className="section-kicker">CHECKOUT / PROVIDER RETURN</p><h1>{paid ? "ชำระเงินสำเร็จ" : "กำลังรอการยืนยัน"}</h1>{order ? <><p>Order {order.orderNumber} · {formatThaiBaht(order.totalSatang)}</p><p>{paid ? "Stripe webhook ยืนยันการชำระแล้ว Entitlement จะปรากฏใน Library" : "หน้า Success ไม่ได้มอบสิทธิ์ ระบบจะรอ Stripe webhook ที่ผ่านการตรวจ signature เท่านั้น"}</p></> : <p>ไม่พบ Order ที่ตรงกับ Session นี้ในบัญชีของคุณ</p>}<Link className="primary-action" href="/account/library">เปิด Library</Link></section></main>;
}
