import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import {
  findAdminProductById,
  listProductCollectionOptions,
} from "@/modules/catalog/infrastructure/admin-product-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { updateProductAction } from "../../actions";
import { ProductForm } from "../../product-form";

export const metadata: Metadata = {
  title: "Edit Product",
  robots: { follow: false, index: false },
};

type EditProductPageProps = {
  params: Promise<{ productId: string }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const { productId } = await params;
  const [product, collectionOptions] = await Promise.all([
    findAdminProductById(productId),
    listProductCollectionOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section className="admin-shell admin-editor">
        <p className="section-kicker">ADMIN / CATALOG / PRODUCTS</p>
        <h1>Edit {product.name}</h1>
        <p>
          Canonical path จะอัปเดตจาก Slug และทุก mutation มี Audit Log
        </p>
        <ProductForm
          action={updateProductAction.bind(null, product.id)}
          collections={collectionOptions}
          product={product}
        />
      </section>
    </main>
  );
}
