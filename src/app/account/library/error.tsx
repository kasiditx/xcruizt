"use client";

export default function LibraryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="state-page">
      <p className="section-kicker">LIBRARY UNAVAILABLE</p>
      <h1>เปิด Library ไม่สำเร็จ</h1>
      <p>การเชื่อมต่อขัดข้องชั่วคราว ลองโหลดข้อมูลอีกครั้ง</p>
      <button onClick={reset} type="button">
        ลองอีกครั้ง
      </button>
    </main>
  );
}
