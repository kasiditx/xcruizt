"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

export default function AdminError({
  reset,
}: {
  reset: () => void;
}) {
  return <AdminErrorState reset={reset} title="โหลดข้อมูล Admin ไม่สำเร็จ" />;
}
