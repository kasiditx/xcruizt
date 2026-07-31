"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AdminProduct } from "@/modules/catalog/infrastructure/admin-product-repository";
import type { AdminProductVersion } from "@/modules/catalog/infrastructure/admin-product-version-repository";

import type { VersionActionState } from "./actions";

const initialState: VersionActionState = { message: "", status: "idle" };

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-action" disabled={pending} type="submit">
      {pending ? "กำลังบันทึก..." : editing ? "บันทึก Draft" : "สร้าง Draft"}
    </button>
  );
}

export function VersionForm({
  action,
  products,
  version,
}: {
  action: (state: VersionActionState, data: FormData) => Promise<VersionActionState>;
  products?: AdminProduct[];
  version?: AdminProductVersion;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="admin-form">
      {state.status === "error" ? <div className="admin-form__error" role="alert">{state.message}</div> : null}
      <div className="admin-form__grid">
        {products ? <label className="admin-form__wide"><span>Product</span><select name="productId" required><option value="">เลือก Product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.status}</option>)}</select></label> : null}
        <label><span>Version</span><input defaultValue={version?.version} name="version" placeholder="1.0.0" required />{errors.version?.[0] ? <p className="admin-form__field-error">{errors.version[0]}</p> : null}</label>
        <div className="admin-version-policy"><strong>Draft only</strong><span>Publish แยกหลังตรวจไฟล์</span></div>
        <label className="admin-form__wide"><span>Changelog (Markdown)</span><textarea defaultValue={version?.changelogMd} name="changelogMd" required rows={8} />{errors.changelogMd?.[0] ? <p className="admin-form__field-error">{errors.changelogMd[0]}</p> : null}</label>
        <label className="admin-form__wide"><span>Release notes (Markdown)</span><textarea defaultValue={version?.releaseNotesMd ?? ""} name="releaseNotesMd" rows={6} /></label>
      </div>
      <div className="admin-form__actions"><SaveButton editing={Boolean(version)} /></div>
    </form>
  );
}
