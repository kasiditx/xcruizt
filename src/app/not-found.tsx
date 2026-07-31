import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="state-page">
      <p className="section-kicker">404 / OUT OF RANGE</p>
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <p>ลิงก์นี้อาจถูกย้าย หรือยังไม่เปิดให้เข้าชม</p>
      <Link href="/">กลับหน้าแรก</Link>
    </main>
  );
}
