"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import type {
  AdminProduct,
  ProductCollectionOption,
} from "@/modules/catalog/infrastructure/admin-product-repository";

import type { ProductActionState } from "./actions";

const initialState: ProductActionState = {
  message: "",
  status: "idle",
};

type ProductFormProps = {
  action: (
    state: ProductActionState,
    formData: FormData,
  ) => Promise<ProductActionState>;
  cancelHref?: string;
  collections: ProductCollectionOption[];
  product?: AdminProduct;
};

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="primary-action" disabled={pending} type="submit">
      {pending
        ? "กำลังบันทึก..."
        : editing
          ? "บันทึกการแก้ไข"
          : "สร้าง Product"}
    </button>
  );
}

export function ProductForm({
  action,
  cancelHref,
  collections,
  product,
}: ProductFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <AdminValidatedForm
      action={formAction}
      className="admin-form"
      fieldErrors={errors}
      formError={state.status === "error" ? state.message : undefined}
    >
      <div className="admin-form__grid">
        <label>
          <span>ชื่อ Product</span>
          <input defaultValue={product?.name} name="name" required />
        </label>

        <label>
          <span>Slug</span>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={product?.slug}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="monday-mellow"
            required
          />
        </label>

        <label>
          <span>Collection</span>
          <select
            defaultValue={product?.collectionId ?? ""}
            name="collectionId"
          >
            <option value="">ไม่อยู่ใน Collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name} · {collection.status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select defaultValue={product?.status ?? "draft"} name="status">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="admin-form__wide">
          <span>คำอธิบายแบบสั้น</span>
          <textarea
            defaultValue={product?.shortDescription}
            name="shortDescription"
            required
            rows={3}
          />
        </label>

        <label className="admin-form__wide">
          <span>รายละเอียด Product</span>
          <textarea
            defaultValue={product?.description}
            name="description"
            required
            rows={8}
          />
        </label>

        <label>
          <span>Mood</span>
          <input defaultValue={product?.mood ?? ""} name="mood" />
        </label>

        <label>
          <span>Brand</span>
          <input
            defaultValue={product?.brandName ?? "XCRUIZT"}
            name="brandName"
            required
          />
        </label>

        <label>
          <span>Schema category</span>
          <input
            defaultValue={
              product?.schemaCategory ?? "FiveM ReShade Preset"
            }
            name="schemaCategory"
            required
          />
        </label>

        <label className="admin-form__checkbox">
          <input
            defaultChecked={product?.isIndexable ?? true}
            name="isIndexable"
            type="checkbox"
          />
          <span>อนุญาตให้ Search Engine index</span>
        </label>

        <label className="admin-form__wide">
          <span>Compatibility JSON</span>
          <textarea
            defaultValue={JSON.stringify(
              product?.compatibility ?? {
                platform: "FiveM",
              },
              null,
              2,
            )}
            name="compatibilityJson"
            required
            rows={6}
            spellCheck={false}
          />
        </label>

        <label>
          <span>SEO title</span>
          <input defaultValue={product?.seoTitle ?? ""} name="seoTitle" />
        </label>

        <label>
          <span>SEO description</span>
          <textarea
            defaultValue={product?.seoDescription ?? ""}
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
        <SaveButton editing={Boolean(product)} />
      </div>
    </AdminValidatedForm>
  );
}
