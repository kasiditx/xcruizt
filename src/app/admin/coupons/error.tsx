"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

export default function AdminCouponsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminErrorState reset={reset} title="โหลด Coupons ไม่สำเร็จ" />;
}
