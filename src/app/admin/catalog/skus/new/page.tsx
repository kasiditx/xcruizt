import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listProductGrantOptions } from "@/modules/catalog/infrastructure/admin-sku-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { createSkuAction } from "../actions";
import { SkuForm } from "../sku-form";

export default async function NewSkuPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const productOptions = await listProductGrantOptions();
  return <main className="admin-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={{ account, status: "ready" }} /></header><section className="admin-shell admin-editor"><p className="section-kicker">ADMIN / CATALOG / SKUS</p><h1>New SKU</h1><p>Active SKU ต้องให้สิทธิ์เฉพาะ Product ที่ Published แล้ว</p><SkuForm action={createSkuAction} products={productOptions} /></section></main>;
}
