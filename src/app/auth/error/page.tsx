import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบไม่สำเร็จ",
  description: "ไม่สามารถยืนยันการเข้าสู่ระบบ XCRUIZT ได้",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthErrorPage() {
  return (
    <main className="state-page">
      <CircleAlert aria-hidden="true" color="#f07d86" size={30} />
      <p className="section-kicker">AUTHENTICATION ERROR</p>
      <h1>เข้าสู่ระบบไม่สำเร็จ</h1>
      <p>
        Discord หรือ session อาจหมดอายุ กรุณากลับไปเข้าสู่ระบบใหม่
      </p>
      <Link href="/auth/login">กลับไปหน้าเข้าสู่ระบบ</Link>
    </main>
  );
}
