"use client";

import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  getAdminNoticeTone,
  type AdminFeedbackTone,
} from "@/modules/administration/application/admin-feedback";

const FEEDBACK_TITLES: Record<AdminFeedbackTone, string> = {
  error: "ดำเนินการไม่สำเร็จ",
  info: "ข้อมูล",
  success: "ดำเนินการสำเร็จ",
  warning: "โปรดตรวจสอบ",
};

const FEEDBACK_ICONS = {
  error: CircleAlert,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
};

type AdminFeedbackProps = {
  message: string;
  mode?: "inline" | "toast";
  noticeCode?: string;
  title?: string;
  tone?: AdminFeedbackTone;
};

export function AdminFeedback({
  message,
  mode = "inline",
  noticeCode,
  title,
  tone = noticeCode ? getAdminNoticeTone(noticeCode) : "info",
}: AdminFeedbackProps) {
  const [visible, setVisible] = useState(true);
  const Icon = FEEDBACK_ICONS[tone];

  const dismiss = useCallback(() => {
    setVisible(false);
    if (mode !== "toast") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has("notice")) return;
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url);
  }, [mode]);

  useEffect(() => {
    if (mode !== "toast") return;
    if (tone === "error" || tone === "warning") return;
    const timeoutId = window.setTimeout(dismiss, 5_000);
    return () => window.clearTimeout(timeoutId);
  }, [dismiss, mode, tone]);

  if (!visible) return null;

  return (
    <div
      aria-atomic="true"
      className={`admin-feedback admin-feedback--${mode} admin-feedback--${tone}`}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" className="admin-feedback__icon" size={20} />
      <div className="admin-feedback__content">
        <strong>{title ?? FEEDBACK_TITLES[tone]}</strong>
        <p>{message}</p>
      </div>
      {mode === "toast" ? (
        <button
          aria-label="ปิดการแจ้งเตือน"
          className="admin-feedback__close"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>
      ) : null}
    </div>
  );
}

export function AdminNotice({
  message,
  noticeCode,
}: {
  message: string;
  noticeCode: string;
}) {
  return (
    <AdminFeedback
      message={message}
      mode="toast"
      noticeCode={noticeCode}
    />
  );
}
