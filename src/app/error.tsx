"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="state-page">
      <p className="section-kicker">SYSTEM / INTERRUPTED</p>
      <h1>หน้านี้โหลดไม่สำเร็จ</h1>
      <p>ลองโหลดอีกครั้ง หากยังพบปัญหาให้กลับมาที่หน้าแรก</p>
      <button type="button" onClick={reset}>
        ลองอีกครั้ง
      </button>
    </main>
  );
}
