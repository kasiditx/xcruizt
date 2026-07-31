"use client";

import { Download } from "lucide-react";
import { useState } from "react";

type DownloadButtonProps = {
  fileId: string;
  filename: string;
  label: string;
  productId: string;
};

export function DownloadButton({
  fileId,
  filename,
  label,
  productId,
}: DownloadButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDownload() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/downloads", {
        body: JSON.stringify({ fileId, productId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();
      const url =
        typeof body?.data?.downloadUrl === "string"
          ? new URL(body.data.downloadUrl)
          : null;

      if (
        !response.ok ||
        !url ||
        url.protocol !== "https:" ||
        !url.hostname.endsWith(".r2.cloudflarestorage.com")
      ) {
        throw new Error("Download is unavailable.");
      }

      window.location.assign(url.toString());
    } catch {
      setError("ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="library-download">
      <button
        className="library-download__button"
        disabled={isLoading}
        onClick={handleDownload}
        type="button"
      >
        <Download aria-hidden="true" size={16} />
        {isLoading ? "กำลังเตรียมไฟล์…" : label}
      </button>
      <span title={filename}>{filename}</span>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
