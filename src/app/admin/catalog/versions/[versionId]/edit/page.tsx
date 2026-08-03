import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountControls } from "@/components/account/account-controls";
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminVersionFiles } from "@/modules/catalog/infrastructure/admin-file-repository";
import { findAdminProductVersionById } from "@/modules/catalog/infrastructure/admin-product-version-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";
import { updateVersionAction } from "../../actions";
import { VersionForm } from "../../version-form";
import { VersionFileManager } from "../../version-file-manager";

export default async function EditVersionPage({ params }: { params: Promise<{ versionId: string }> }) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const { versionId } = await params;
  const [version, files] = await Promise.all([
    findAdminProductVersionById(versionId),
    listAdminVersionFiles(versionId),
  ]);
  if (!version || version.status !== "draft") notFound();
  return <main className="admin-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={{ account, status: "ready" }} /></header><section className="admin-shell admin-editor"><AdminBreadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { href: "/admin/catalog/versions", label: "Versions" }, { label: `${version.productName} ${version.version}` }]} /><p className="section-kicker">ADMIN / CATALOG / VERSIONS</p><h1>Edit {version.version}</h1><p>{version.productName} · Draft metadata</p><VersionForm action={updateVersionAction.bind(null, version.id)} cancelHref="/admin/catalog/versions" version={version} /><VersionFileManager files={files} versionId={version.id} /></section></main>;
}
