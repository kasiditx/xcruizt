"use client";

export default function DiscordAccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="account-page">
      <div className="account-error" role="alert">
        <h1>โหลดสถานะ Discord ไม่สำเร็จ</h1>
        <p>กรุณาลองใหม่ ระบบ Library และสิทธิ์ดาวน์โหลดยังไม่ถูกกระทบ</p>
        <button className="primary-action" onClick={reset} type="button">
          ลองอีกครั้ง
        </button>
      </div>
    </main>
  );
}
