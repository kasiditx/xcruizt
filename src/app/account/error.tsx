"use client";

export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <main className="state-page">
      <p className="section-kicker">ACCOUNT UNAVAILABLE</p>
      <h1>โหลดข้อมูลบัญชีไม่สำเร็จ</h1>
      <p>การเชื่อมต่อขัดข้องชั่วคราว กรุณาลองอีกครั้ง</p>
      <button onClick={reset} type="button">
        ลองอีกครั้ง
      </button>
    </main>
  );
}
