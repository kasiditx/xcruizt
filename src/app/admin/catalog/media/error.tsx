"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

export default function AdminMediaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminErrorState reset={reset} title="โหลด Product media ไม่สำเร็จ" />;
}
