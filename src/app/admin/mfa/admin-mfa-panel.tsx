"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";

import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function AdminMfaPanel({
  enforced,
  hasUnverifiedTotp,
  nextPath,
  verifiedTotpFactorId,
}: {
  enforced: boolean;
  hasUnverifiedTotp: boolean;
  nextPath: string;
  verifiedTotpFactorId: string | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [message, setMessage] = useState("");
  const factorId = enrollment?.factorId ?? verifiedTotpFactorId;

  async function startEnrollment() {
    setBusy(true);
    setMessage("");
    try {
      if (hasUnverifiedTotp) {
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;

        for (const factor of factors.data.all) {
          if (
            factor.factor_type === "totp" &&
            factor.status === "unverified"
          ) {
            const removal = await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
            if (removal.error) throw removal.error;
          }
        }
      }

      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "XCRUIZT Admin",
      });
      if (result.error) throw result.error;

      setEnrollment({
        factorId: result.data.id,
        qrCode: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    } catch {
      setMessage("เริ่มตั้งค่า MFA ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setMessage("กรุณากรอกรหัส 6 หลักจาก Authenticator");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        code,
        factorId,
      });
      if (result.error) throw result.error;
      window.location.assign(nextPath);
    } catch {
      setMessage("รหัสไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-mfa-panel">
      <div className="admin-mfa-panel__status">
        <p className="section-kicker">ADMIN / STEP-UP AUTH</p>
        <h1>Multi-factor authentication</h1>
        <p>
          {enforced
            ? "Admin ต้องยืนยัน TOTP ให้ session อยู่ระดับ AAL2 ก่อนใช้ Operations"
            : "Local development แสดง flow สำหรับตั้งค่า แต่ยังไม่บังคับ AAL2"}
        </p>
      </div>

      {!verifiedTotpFactorId && !enrollment ? (
        <button
          className="primary-action"
          disabled={busy}
          onClick={startEnrollment}
          type="button"
        >
          {busy ? "กำลังเตรียม…" : "ตั้งค่า Authenticator"}
        </button>
      ) : null}

      {enrollment ? (
        <section className="admin-mfa-enrollment" aria-labelledby="mfa-qr-title">
          <div>
            <p className="section-kicker">STEP 1</p>
            <h2 id="mfa-qr-title">Scan QR code</h2>
            <p>ใช้ Authenticator app สแกน QR นี้ หรือกรอก secret ด้วยตัวเอง</p>
            <code>{enrollment.secret}</code>
          </div>
          <Image
            alt="QR code สำหรับตั้งค่า XCRUIZT Admin MFA"
            height={220}
            src={enrollment.qrCode}
            unoptimized
            width={220}
          />
        </section>
      ) : null}

      {factorId ? (
        <AdminValidatedForm className="admin-mfa-form" onSubmit={verifyCode}>
          <div>
            <p className="section-kicker">STEP 2</p>
            <h2>Verify code</h2>
          </div>
          <label>
            <span>Authenticator code</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              name="authenticatorCode"
              onChange={(event) => setCode(event.target.value)}
              pattern="[0-9]{6}"
              required
              title="กรุณากรอกรหัสตัวเลข 6 หลัก"
              value={code}
            />
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            {busy ? "กำลังตรวจสอบ…" : "ยืนยันและเข้า Admin"}
          </button>
        </AdminValidatedForm>
      ) : null}

      {message ? <AdminFeedback message={message} tone="error" /> : null}
    </div>
  );
}
