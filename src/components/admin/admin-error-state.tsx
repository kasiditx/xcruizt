"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useId } from "react";

export function AdminErrorState({
  description = "ระบบไม่สามารถโหลดข้อมูลส่วนนี้ได้ในขณะนี้ ลองอีกครั้งโดยข้อมูลที่กรอกจะไม่ถูกส่งซ้ำอัตโนมัติ",
  reset,
  title,
}: {
  description?: string;
  reset: () => void;
  title: string;
}) {
  const titleId = useId();

  return (
    <main className="admin-error-state" role="alert" aria-labelledby={titleId}>
      <TriangleAlert aria-hidden="true" size={24} />
      <p className="section-kicker">ADMIN UNAVAILABLE</p>
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
      <button className="primary-action" onClick={reset} type="button">
        <RotateCcw aria-hidden="true" size={17} />
        ลองโหลดอีกครั้ง
      </button>
    </main>
  );
}
