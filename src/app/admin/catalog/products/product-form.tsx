"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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
  collections: ProductCollectionOption[];
  product?: AdminProduct;
};

function ErrorText({
  errors,
  id,
}: {
  errors?: string[];
  id: string;
}) {
  return errors?.[0] ? (
    <p className="admin-form__field-error" id={id}>
      {errors[0]}
    </p>
  ) : null;
}

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
  collections,
  product,
}: ProductFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="admin-form">
      {state.status === "error" ? (
        <div className="admin-form__error" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="admin-form__grid">
        <label>
          <span>ชื่อ Product</span>
          <input defaultValue={product?.name} name="name" required />
          <ErrorText errors={errors.name} id="product-name-error" />
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
          <ErrorText errors={errors.slug} id="product-slug-error" />
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
          <ErrorText
            errors={errors.collectionId}
            id="product-collection-error"
          />
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
          <ErrorText
            errors={errors.shortDescription}
            id="product-short-description-error"
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
          <ErrorText
            errors={errors.description}
            id="product-description-error"
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
          <ErrorText
            errors={errors.compatibilityJson}
            id="product-compatibility-error"
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
        <SaveButton editing={Boolean(product)} />
      </div>
    </form>
  );
}
