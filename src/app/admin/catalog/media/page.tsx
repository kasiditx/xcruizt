import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminFeedback, AdminNotice } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { env } from "@/lib/env/server";
import { resolvePublicMediaSource } from "@/modules/catalog/application/media-url";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminProductMedia } from "@/modules/catalog/infrastructure/admin-media-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import {
  createProductMediaAction,
  removeProductMediaAction,
} from "./actions";

const notices: Record<string, string> = {
  created: "เพิ่ม Product media และ Audit Log แล้ว",
  dimension_mismatch: "ภาพ Before และ After ต้องมีขนาดเท่ากัน",
  duplicate: "Media URL และ Role นี้มีอยู่แล้ว",
  invalid: "ข้อมูล Media ไม่ถูกต้อง หรือ OG ไม่ใช่ 1200×630",
  not_found: "ไม่พบ Media",
  product_not_found: "ไม่พบ Product",
  removed: "ลบ Media association แล้ว โดยไม่ได้ลบไฟล์ต้นทาง",
  unapproved_origin:
    "Media URL ต้องอยู่บน Site หรือ NEXT_PUBLIC_MEDIA_ORIGIN ที่กำหนด",
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const [data, query] = await Promise.all([
    listAdminProductMedia(),
    searchParams,
  ]);

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section aria-labelledby="product-media-title" className="admin-shell">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / CATALOG</p>
            <h1 id="product-media-title">Product media</h1>
            <p>
              เพิ่มเฉพาะ URL จาก Public media origin ที่อนุญาต ภาพ Before/After
              ต้องขนาดตรงกัน
            </p>
          </div>
          <Link
            className="admin-secondary-action"
            href="/admin/catalog/products"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            กลับไป Products
          </Link>
        </div>
        {query.notice && notices[query.notice] ? (
          <AdminNotice
            message={notices[query.notice]}
            noticeCode={query.notice}
          />
        ) : null}
        {!env.NEXT_PUBLIC_MEDIA_ORIGIN ? (
          <AdminFeedback
            message="ยังไม่ได้ตั้ง NEXT_PUBLIC_MEDIA_ORIGIN จึงรับได้เฉพาะ Path ภายในเว็บไซต์ เช่น /media/example.webp"
            tone="warning"
          />
        ) : null}

        <AdminValidatedForm action={createProductMediaAction} className="admin-form">
          <div className="admin-form__grid">
            <label>
              <span>Product</span>
              <select name="productId" required>
                <option value="">เลือก Product</option>
                {data.productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Role</span>
              <select defaultValue="gallery" name="imageRole">
                <option value="cover">Cover</option>
                <option value="thumbnail">Thumbnail</option>
                <option value="gallery">Gallery</option>
                <option value="before">Before</option>
                <option value="after">After</option>
                <option value="og">OG 1200×630</option>
              </select>
            </label>
            <label className="admin-form__wide">
              <span>Public media URL หรือ Site path</span>
              <input
                name="storageUrl"
                placeholder="https://media.example/product.webp"
                required
              />
            </label>
            <label className="admin-form__wide">
              <span>Alt text</span>
              <input maxLength={300} name="altText" required />
            </label>
            <label>
              <span>Width</span>
              <input min="1" name="width" required type="number" />
            </label>
            <label>
              <span>Height</span>
              <input min="1" name="height" required type="number" />
            </label>
            <label>
              <span>Sort order</span>
              <input
                defaultValue="0"
                min="0"
                name="sortOrder"
                required
                type="number"
              />
            </label>
          </div>
          <button className="primary-action" type="submit">
            Add media
          </button>
        </AdminValidatedForm>

        <div className="admin-table-wrap">
          <table className="admin-table admin-table--responsive">
            <thead>
              <tr>
                <th scope="col">Preview</th>
                <th scope="col">Product</th>
                <th scope="col">Role</th>
                <th scope="col">Dimensions</th>
                <th scope="col">Alt</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.images.map((image) => {
                const src = resolvePublicMediaSource(
                  image.storageUrl,
                  env.NEXT_PUBLIC_SITE_URL,
                  env.NEXT_PUBLIC_MEDIA_ORIGIN,
                );

                return (
                  <tr key={image.id}>
                    <td data-label="Preview">
                      {src ? (
                        <Image alt="" height={54} src={src} width={96} />
                      ) : (
                        "Blocked URL"
                      )}
                    </td>
                    <td data-label="Product">{image.productName}</td>
                    <td data-label="Role">{image.imageRole}</td>
                    <td data-label="Dimensions">
                      {image.width}×{image.height}
                    </td>
                    <td data-label="Alt">{image.altText}</td>
                    <td data-label="Action">
                      <form action={removeProductMediaAction}>
                        <input name="imageId" type="hidden" value={image.id} />
                        <button className="admin-inline-action" type="submit">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.images.length === 0 ? <p className="admin-table-empty">ยังไม่มี Product media</p> : null}
        </div>
      </section>
    </main>
  );
}
