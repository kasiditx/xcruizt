"use client";

export default function AdminError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="state-page">
      <p className="section-kicker">ADMIN UNAVAILABLE</p>
      <h1>โหลดข้อมูล Admin ไม่สำเร็จ</h1>
      <p>ลองใหม่อีกครั้ง โดยระบบจะไม่เปิดเผยรายละเอียดภายใน</p>
      <button onClick={reset} type="button">
        ลองใหม่
      </button>
    </main>
  );
}
