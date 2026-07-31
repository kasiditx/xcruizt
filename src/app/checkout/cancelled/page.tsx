import { CircleX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout Cancelled",
  robots: { follow: false, index: false },
};

export default async function CheckoutCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return <main className="store-page"><section className="checkout-state"><CircleX aria-hidden="true" /><p className="section-kicker">CHECKOUT / CANCELLED</p><h1>ยกเลิกการชำระเงินแล้ว</h1><p>{order ? `Order ${order} ยังไม่ได้รับการยืนยันการชำระเงิน` : "ยังไม่มีการชำระเงินที่ยืนยันแล้ว"}</p><Link className="primary-action" href="/cart">กลับไปที่ Cart</Link></section></main>;
}
