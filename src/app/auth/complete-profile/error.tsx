"use client";

export default function CompleteProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="state-page">
      <p className="section-kicker">PROFILE UNAVAILABLE</p>
      <h1>เปิดข้อมูลบัญชีไม่สำเร็จ</h1>
      <p>การเชื่อมต่อขัดข้องชั่วคราว ลองใหม่อีกครั้ง</p>
      <button onClick={reset} type="button">
        ลองอีกครั้ง
      </button>
    </main>
  );
}
