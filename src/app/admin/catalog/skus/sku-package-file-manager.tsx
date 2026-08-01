"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAX_PRODUCT_FILE_SIZE_BYTES } from "@/modules/catalog/application/file-upload-input";
import type { AdminSkuPackageFile } from "@/modules/catalog/infrastructure/admin-file-repository";

export function SkuPackageFileManager({
  files,
  skuId,
  skuType,
}: {
  files: AdminSkuPackageFile[];
  skuId: string;
  skuType: "single" | "collection" | "bundle";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const extension = skuType === "single" ? ".ini" : ".rar";

  async function sha256(file: File) {
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

  function resolveContentType(file: File) {
    if (extension === ".ini") return "text/plain";
    return file.type === "application/vnd.rar"
      ? file.type
      : "application/vnd.rar";
  }

  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("กรุณาเลือกไฟล์ Package");
      return;
    }
    if (!file.name.toLowerCase().endsWith(extension)) {
      setError(`SKU ประเภทนี้ต้องใช้ไฟล์ ${extension}`);
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
      const preparation = await fetch("/api/admin/sku-packages/upload", {
        body: JSON.stringify({
          contentType: resolveContentType(file),
          fileRole: "main_package",
          fileSizeBytes: file.size,
          originalFilename: file.name,
          sha256: digest.hex,
          sha256Base64: digest.base64,
          skuId,
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
      if (!uploadResponse.ok) throw new Error("R2 upload failed.");

      setProgress("กำลังตรวจขนาด ชนิดไฟล์ และ Checksum…");
      const completion = await fetch("/api/admin/sku-packages/complete", {
        body: JSON.stringify({ fileId: prepared.data.fileId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!completion.ok) throw new Error("Upload verification failed.");

      setProgress("อัปโหลด Package สำเร็จ");
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
    <section aria-labelledby="sku-package-files-title" className="admin-files">
      <div>
        <p className="section-kicker">PRIVATE SKU PACKAGE</p>
        <h2 id="sku-package-files-title">ไฟล์ที่ลูกค้าจะได้รับ</h2>
        <p>
          {skuType === "single"
            ? "Single ใช้ไฟล์ .ini"
            : "Collection/Bundle ใช้ไฟล์ .rar"}
          {" · "}ไฟล์จะ Active หลังตรวจ R2 สำเร็จ
        </p>
      </div>
      <form action={upload} className="admin-file-upload">
        <label className="admin-file-upload__picker">
          <span>ไฟล์จริง (สูงสุด 250 MB)</span>
          <input
            accept={extension}
            disabled={isUploading}
            name="file"
            required
            type="file"
          />
        </label>
        <button className="primary-action" disabled={isUploading} type="submit">
          <UploadCloud aria-hidden="true" size={17} />
          {isUploading ? "กำลังอัปโหลด…" : `Upload ${extension}`}
        </button>
      </form>
      {progress ? <p className="admin-notice" role="status">{progress}</p> : null}
      {error ? <p className="admin-form__error" role="alert">{error}</p> : null}
      {files.length === 0 ? (
        <p className="admin-files__empty">ยังไม่มี Package file</p>
      ) : (
        <ul className="admin-files__list">
          {files.map((file) => (
            <li key={file.id}>
              <div>
                <strong>{file.originalFilename}</strong>
                <span>{file.fileRole} · {(file.fileSizeBytes / 1_048_576).toFixed(2)} MB</span>
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
