"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type {
  AdminSku,
  ProductGrantOption,
} from "@/modules/catalog/infrastructure/admin-sku-repository";

import type { SkuActionState } from "./actions";

const initialState: SkuActionState = { message: "", status: "idle" };

type SkuFormProps = {
  action: (
    state: SkuActionState,
    formData: FormData,
  ) => Promise<SkuActionState>;
  products: ProductGrantOption[];
  sku?: AdminSku;
};

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-action" disabled={pending} type="submit">
      {pending ? "กำลังบันทึก..." : editing ? "บันทึก SKU" : "สร้าง SKU"}
    </button>
  );
}

export function SkuForm({ action, products, sku }: SkuFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="admin-form">
      {state.status === "error" ? (
        <div className="admin-form__error" role="alert">{state.message}</div>
      ) : null}
      <div className="admin-form__grid">
        <label>
          <span>ชื่อ SKU</span>
          <input defaultValue={sku?.name} name="name" required />
        </label>
        <label>
          <span>SKU code</span>
          <input defaultValue={sku?.skuCode} name="skuCode" required />
        </label>
        <label>
          <span>Slug</span>
          <input defaultValue={sku?.slug} name="slug" required />
        </label>
        <label>
          <span>ประเภท</span>
          <select defaultValue={sku?.skuType ?? "single"} name="skuType">
            <option value="single">Single</option>
            <option value="collection">Collection</option>
            <option value="bundle">Bundle</option>
          </select>
        </label>
        <label>
          <span>ราคาขาย (THB)</span>
          <input
            defaultValue={sku ? (sku.priceSatang / 100).toFixed(2) : ""}
            inputMode="decimal"
            name="priceThaiBaht"
            placeholder="49.00"
            required
          />
          {errors.priceThaiBaht?.[0] ? <p className="admin-form__field-error">{errors.priceThaiBaht[0]}</p> : null}
        </label>
        <label>
          <span>ราคาเปรียบเทียบ (THB)</span>
          <input
            defaultValue={sku?.compareAtPriceSatang != null ? (sku.compareAtPriceSatang / 100).toFixed(2) : ""}
            inputMode="decimal"
            name="compareAtPriceThaiBaht"
          />
          {errors.compareAtPriceThaiBaht?.[0] ? <p className="admin-form__field-error">{errors.compareAtPriceThaiBaht[0]}</p> : null}
        </label>
        <input name="currency" type="hidden" value="THB" />
        <label>
          <span>Status</span>
          <select defaultValue={sku?.status ?? "draft"} name="status">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span>Purchase limit</span>
          <input defaultValue={sku?.purchaseLimit ?? ""} min={1} name="purchaseLimit" type="number" />
        </label>
        <label className="admin-form__wide">
          <span>Stripe Price ID (ใส่เมื่อสร้างใน Stripe แล้ว)</span>
          <input defaultValue={sku?.stripePriceId ?? ""} name="stripePriceId" placeholder="price_..." />
        </label>
        <fieldset className="admin-grant-picker admin-form__wide">
          <legend>Product grants</legend>
          {products.length === 0 ? (
            <p>ยังไม่มี Product กรุณาสร้าง Product ก่อน</p>
          ) : products.map((product) => (
            <label key={product.id}>
              <input
                defaultChecked={sku?.productIds.includes(product.id)}
                name="productIds"
                type="checkbox"
                value={product.id}
              />
              <span>{product.name} · {product.status}</span>
            </label>
          ))}
          {errors.productIds?.[0] ? <p className="admin-form__field-error">{errors.productIds[0]}</p> : null}
        </fieldset>
      </div>
      <div className="admin-form__actions">
        <SaveButton editing={Boolean(sku)} />
      </div>
    </form>
  );
}
