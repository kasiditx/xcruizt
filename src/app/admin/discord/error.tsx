"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

export default function AdminDiscordError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminErrorState reset={reset} title="โหลด Discord operations ไม่สำเร็จ" />;
}
