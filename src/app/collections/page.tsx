import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { listPublishedCollections } from "@/modules/catalog/infrastructure/storefront-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  alternates: { canonical: "/collections" },
  description: "สำรวจ Collection ของ XCRUIZT ReShade presets สำหรับ FiveM",
  openGraph: {
    description: "เลือก Collection จาก mood, light และ clarity ที่ต้องการ",
    title: "XCRUIZT Collections",
    url: "/collections",
  },
  title: "Collections",
};

export default async function CollectionsPage() {
  const [resolution, collectionRows] = await Promise.all([
    getCurrentAccountResolution(),
    listPublishedCollections(),
  ]);

  return (
    <main className="store-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={resolution} />
      </header>
      <section aria-labelledby="collections-title" className="store-shell">
        <p className="section-kicker">COLOR SYSTEMS / COLLECTIONS</p>
        <h1 id="collections-title">Collections</h1>
        <p className="store-intro">
          เลือกจากบรรยากาศและเป้าหมายการมองเห็นของแต่ละ Collection
        </p>

        {collectionRows.length === 0 ? (
          <div className="store-empty">
            <h2>กำลังเตรียม Collection</h2>
            <p>หน้านี้จะแสดงเฉพาะ Collection ที่ Publish แล้วจาก Catalog</p>
          </div>
        ) : (
          <div className="collection-list store-collection-list">
            {collectionRows.map((collection, index) => (
              <article className="collection-row" key={collection.id}>
                <span className="collection-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p>
                    {collection.tagline ??
                      collection.accentKey ??
                      "XCRUIZT COLLECTION"}
                  </p>
                  <h2>
                    <Link href={`/collections/${collection.slug}`}>
                      {collection.name}
                    </Link>
                  </h2>
                </div>
                <p className="collection-description">
                  {collection.description}
                </p>
                <ArrowRight
                  aria-hidden="true"
                  className="collection-arrow"
                  size={22}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
