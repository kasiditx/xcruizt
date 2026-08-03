"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { MAX_PRODUCT_FILE_SIZE_BYTES } from "@/modules/catalog/application/file-upload-input";
import type { AdminVersionFile } from "@/modules/catalog/infrastructure/admin-file-repository";

type FileRole =
  | "checksum"
  | "extra"
  | "guide"
  | "installer"
  | "main_package";

async function sha256(file: File): Promise<{
  base64: string;
  hex: string;
}> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
  );
  return {
    base64: btoa(String.fromCharCode(...digest)),
    hex: [...digest]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };
}

function resolveContentType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  return (
    {
      ".exe": "application/octet-stream",
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".zip": "application/zip",
    }[extension ?? ""] ?? "application/octet-stream"
  );
}

export function VersionFileManager({
  files,
  versionId,
}: {
  files: AdminVersionFile[];
  versionId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState("");

  async function upload(formData: FormData) {
    const file = formData.get("file");
    const fileRole = formData.get("fileRole") as FileRole | null;
    if (!(file instanceof File) || !fileRole || file.size === 0) {
      setError("กรุณาเลือกไฟล์และ File role");
      return;
    }
    if (file.size > MAX_PRODUCT_FILE_SIZE_BYTES) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 250 MB");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      setProgress("กำลังตรวจ SHA-256…");
      const digest = await sha256(file);
      const preparation = await fetch("/api/admin/files/upload", {
        body: JSON.stringify({
          contentType: resolveContentType(file),
          fileRole,
          fileSizeBytes: file.size,
          originalFilename: file.name,
          sha256: digest.hex,
          sha256Base64: digest.base64,
          versionId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const prepared = await preparation.json();
      if (!preparation.ok || typeof prepared?.data?.uploadUrl !== "string") {
        throw new Error("Upload preparation failed.");
      }

      setProgress("กำลังส่งไฟล์ไป Private R2…");
      const uploadResponse = await fetch(prepared.data.uploadUrl, {
        body: file,
        headers: prepared.data.headers,
        method: "PUT",
      });
      if (!uploadResponse.ok) {
        throw new Error("R2 upload failed.");
      }

      setProgress("กำลังตรวจขนาด ชนิดไฟล์ และ Checksum…");
      const completion = await fetch("/api/admin/files/complete", {
        body: JSON.stringify({ fileId: prepared.data.fileId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!completion.ok) {
        throw new Error("Upload verification failed.");
      }

      setProgress("อัปโหลดและตรวจสอบสำเร็จ");
      router.refresh();
    } catch {
      setError(
        "อัปโหลดไม่สำเร็จ ตรวจ R2 credentials, CORS และชนิดไฟล์แล้วลองใหม่",
      );
      setProgress("");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section aria-labelledby="version-files-title" className="admin-files">
      <div>
        <p className="section-kicker">PRIVATE PRODUCT FILES</p>
        <h2 id="version-files-title">Version files</h2>
        <p>
          ไฟล์จะเริ่มเป็น Staging และเปลี่ยนเป็น Active
          หลังตรวจ metadata จาก R2 สำเร็จ
        </p>
      </div>

      <AdminValidatedForm action={upload} className="admin-file-upload">
        <label>
          <span>File role</span>
          <select defaultValue="main_package" name="fileRole">
            <option value="main_package">Main package (.zip)</option>
            <option value="installer">Installer (.exe)</option>
            <option value="guide">Guide (.pdf)</option>
            <option value="checksum">Checksum (.txt)</option>
            <option value="extra">Extra (.zip/.pdf/.txt)</option>
          </select>
        </label>
        <label className="admin-file-upload__picker">
          <span>ไฟล์จริง (สูงสุด 250 MB)</span>
          <input
            accept=".zip,.exe,.pdf,.txt"
            disabled={isUploading}
            name="file"
            required
            type="file"
          />
        </label>
        <button
          className="primary-action"
          disabled={isUploading}
          type="submit"
        >
          <UploadCloud aria-hidden="true" size={17} />
          {isUploading ? "กำลังอัปโหลด…" : "Upload to R2"}
        </button>
      </AdminValidatedForm>

      {progress ? <AdminFeedback message={progress} tone="info" /> : null}
      {error ? <AdminFeedback message={error} tone="error" /> : null}

      {files.length === 0 ? (
        <p className="admin-files__empty">ยังไม่มีไฟล์ใน Version นี้</p>
      ) : (
        <ul className="admin-files__list">
          {files.map((file) => (
            <li key={file.id}>
              <div>
                <strong>{file.originalFilename}</strong>
                <span>
                  {file.fileRole} · {(file.fileSizeBytes / 1_048_576).toFixed(2)} MB
                </span>
              </div>
              <span className={`admin-status admin-status--${file.status}`}>
                {file.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
