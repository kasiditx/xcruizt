"use client";

export default function AdminMediaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="admin-page"><div className="admin-error" role="alert"><h1>โหลด Product media ไม่สำเร็จ</h1><button className="primary-action" onClick={reset} type="button">ลองใหม่</button></div></main>;
}
