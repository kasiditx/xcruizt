"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import type { AdminCollection } from "@/modules/catalog/infrastructure/admin-collection-repository";

import type { CollectionActionState } from "./actions";

const initialActionState: CollectionActionState = {
  status: "idle",
  message: "",
};

type CollectionFormProps = {
  action: (
    state: CollectionActionState,
    formData: FormData,
  ) => Promise<CollectionActionState>;
  cancelHref?: string;
  collection?: AdminCollection;
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="primary-action" disabled={pending} type="submit">
      {pending
        ? "กำลังบันทึก..."
        : editing
          ? "บันทึกการแก้ไข"
          : "สร้าง Collection"}
    </button>
  );
}

export function CollectionForm({
  action,
  cancelHref,
  collection,
}: CollectionFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialActionState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <AdminValidatedForm
      action={formAction}
      className="admin-form"
      fieldErrors={fieldErrors}
      formError={state.status === "error" ? state.message : undefined}
    >
      <div className="admin-form__grid">
        <label>
          <span>ชื่อ Collection</span>
          <input
            defaultValue={collection?.name}
            name="name"
            required
          />
        </label>

        <label>
          <span>Slug</span>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={collection?.slug}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="sevora"
            required
          />
        </label>

        <label className="admin-form__wide">
          <span>Tagline</span>
          <input
            defaultValue={collection?.tagline ?? ""}
            name="tagline"
            placeholder="7 DAYS · 7 MOODS"
          />
        </label>

        <label className="admin-form__wide">
          <span>คำอธิบาย</span>
          <textarea
            defaultValue={collection?.description}
            name="description"
            required
            rows={6}
          />
        </label>

        <label>
          <span>Status</span>
          <select
            defaultValue={collection?.status ?? "draft"}
            name="status"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label>
          <span>Sort order</span>
          <input
            defaultValue={collection?.sortOrder ?? 0}
            min={0}
            name="sortOrder"
            required
            type="number"
          />
        </label>

        <label>
          <span>Accent key</span>
          <input
            defaultValue={collection?.accentKey ?? ""}
            name="accentKey"
            placeholder="violet"
          />
        </label>

        <label>
          <span>SEO title</span>
          <input
            defaultValue={collection?.seoTitle ?? ""}
            name="seoTitle"
          />
        </label>

        <label className="admin-form__wide">
          <span>SEO description</span>
          <textarea
            defaultValue={collection?.seoDescription ?? ""}
            name="seoDescription"
            rows={3}
          />
        </label>
      </div>

      <div className="admin-form__actions">
        {cancelHref ? (
          <Link className="admin-form__cancel" href={cancelHref}>
            กลับไปหน้ารายการ
          </Link>
        ) : null}
        <SubmitButton editing={Boolean(collection)} />
      </div>
    </AdminValidatedForm>
  );
}
