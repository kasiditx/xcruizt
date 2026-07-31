"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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
  collection?: AdminCollection;
};

function FieldError({
  errors,
  id,
}: {
  errors?: string[];
  id: string;
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="admin-form__field-error" id={id}>
      {errors[0]}
    </p>
  );
}

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
  collection,
}: CollectionFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialActionState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="admin-form">
      {state.status === "error" ? (
        <div className="admin-form__error" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="admin-form__grid">
        <label>
          <span>ชื่อ Collection</span>
          <input
            aria-describedby={
              fieldErrors.name ? "collection-name-error" : undefined
            }
            defaultValue={collection?.name}
            name="name"
            required
          />
          <FieldError
            errors={fieldErrors.name}
            id="collection-name-error"
          />
        </label>

        <label>
          <span>Slug</span>
          <input
            aria-describedby={
              fieldErrors.slug ? "collection-slug-error" : undefined
            }
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={collection?.slug}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="sevora"
            required
          />
          <FieldError
            errors={fieldErrors.slug}
            id="collection-slug-error"
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
            aria-describedby={
              fieldErrors.description
                ? "collection-description-error"
                : undefined
            }
            defaultValue={collection?.description}
            name="description"
            required
            rows={6}
          />
          <FieldError
            errors={fieldErrors.description}
            id="collection-description-error"
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
          <FieldError
            errors={fieldErrors.status}
            id="collection-status-error"
          />
        </label>

        <label>
          <span>Sort order</span>
          <input
            aria-describedby={
              fieldErrors.sortOrder
                ? "collection-sort-order-error"
                : undefined
            }
            defaultValue={collection?.sortOrder ?? 0}
            min={0}
            name="sortOrder"
            required
            type="number"
          />
          <FieldError
            errors={fieldErrors.sortOrder}
            id="collection-sort-order-error"
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
        <SubmitButton editing={Boolean(collection)} />
      </div>
    </form>
  );
}
