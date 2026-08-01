import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { findAdminSkuById, listProductGrantOptions } from "@/modules/catalog/infrastructure/admin-sku-repository";
import { listAdminSkuPackageFiles } from "@/modules/catalog/infrastructure/admin-file-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { updateSkuAction } from "../../actions";
import { SkuForm } from "../../sku-form";
import { SkuPackageFileManager } from "../../sku-package-file-manager";

export default async function EditSkuPage({ params }: { params: Promise<{ skuId: string }> }) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const { skuId } = await params;
  const [sku, productOptions, packageFiles] = await Promise.all([
    findAdminSkuById(skuId),
    listProductGrantOptions(),
    listAdminSkuPackageFiles(skuId),
  ]);
  if (!sku) notFound();
  return <main className="admin-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={{ account, status: "ready" }} /></header><section className="admin-shell admin-editor"><p className="section-kicker">ADMIN / CATALOG / SKUS</p><h1>Edit {sku.name}</h1><p>การเปลี่ยนราคา สถานะ หรือ grants จะถูกบันทึกใน Audit Log</p><SkuForm action={updateSkuAction.bind(null, sku.id)} products={productOptions} sku={sku} /><SkuPackageFileManager files={packageFiles} skuId={sku.id} skuType={sku.skuType} /></section></main>;
}
