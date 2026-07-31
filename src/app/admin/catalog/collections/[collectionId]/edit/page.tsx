import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { findAdminCollectionById } from "@/modules/catalog/infrastructure/admin-collection-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { updateCollectionAction } from "../../actions";
import { CollectionForm } from "../../collection-form";

export const metadata: Metadata = {
  title: "Edit Collection",
  robots: {
    index: false,
    follow: false,
  },
};

type EditCollectionPageProps = {
  params: Promise<{ collectionId: string }>;
};

export default async function EditCollectionPage({
  params,
}: EditCollectionPageProps) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const { collectionId } = await params;
  const collection = await findAdminCollectionById(collectionId);

  if (!collection) {
    notFound();
  }

  const action = updateCollectionAction.bind(null, collection.id);

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls
          resolution={{ account, status: "ready" }}
        />
      </header>
      <section className="admin-shell admin-editor">
        <p className="section-kicker">ADMIN / CATALOG / COLLECTIONS</p>
        <h1>Edit {collection.name}</h1>
        <p>
          การเปลี่ยนสถานะและข้อมูลทุกครั้งจะถูกบันทึกใน Admin Audit Log
        </p>
        <CollectionForm action={action} collection={collection} />
      </section>
    </main>
  );
}
