import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { ProductCard } from "@/components/store/product-card";
import {
  filterStoreProducts,
  parseStoreFilters,
} from "@/modules/catalog/application/store-filter";
import {
  listPublishedCollections,
  listStoreProducts,
} from "@/modules/catalog/infrastructure/storefront-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Shop",
  description: "เลือกซื้อ XCRUIZT ReShade presets สำหรับ FiveM",
  alternates: { canonical: "/shop" },
  openGraph: {
    description: "เลือก ReShade preset ตาม Collection, mood และ SKU จาก XCRUIZT",
    title: "Shop XCRUIZT ReShade Presets",
    url: "/shop",
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolution, allProducts, collectionRows, query] = await Promise.all([
    getCurrentAccountResolution(),
    listStoreProducts(),
    listPublishedCollections(),
    searchParams,
  ]);
  const scalarQuery = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const filters = parseStoreFilters(scalarQuery);
  const products = filterStoreProducts(allProducts, filters);

  return (
    <main className="store-page">
      <header className="account-header">
        <Link className="wordmark" href="/">XCRUIZT<span>®</span></Link>
        <AccountControls resolution={resolution} />
      </header>
      <section className="store-shell" aria-labelledby="shop-title">
        <p className="section-kicker">STORE / PUBLISHED CATALOG</p>
        <h1 id="shop-title">Shop</h1>
        <form className="store-filter-form" method="get">
          <label><span>ค้นหา</span><input defaultValue={filters.q} name="q" placeholder="ชื่อ, mood หรือ Collection" /></label>
          <label><span>Collection</span><select defaultValue={filters.collection ?? ""} name="collection"><option value="">ทั้งหมด</option>{collectionRows.map((collection) => <option key={collection.id} value={collection.slug}>{collection.name}</option>)}</select></label>
          <label><span>SKU type</span><select defaultValue={filters.type ?? ""} name="type"><option value="">ทั้งหมด</option><option value="single">Single</option><option value="collection">Collection</option><option value="bundle">Bundle</option></select></label>
          <label><span>เรียงตาม</span><select defaultValue={filters.sort ?? "name"} name="sort"><option value="name">ชื่อ</option><option value="price_asc">ราคาต่ำ–สูง</option><option value="price_desc">ราคาสูง–ต่ำ</option></select></label>
          <button className="secondary-action" type="submit">ใช้ตัวกรอง</button>
          <Link className="text-action" href="/shop">ล้างตัวกรอง</Link>
        </form>
        {products.length === 0 ? (
          <div className="store-empty"><h2>ยังไม่มีสินค้าที่เปิดขาย</h2><p>Storefront จะแสดงเฉพาะ Published Product ที่มี Active SKU เท่านั้น</p></div>
        ) : (
          <div className="store-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        )}
      </section>
    </main>
  );
}
