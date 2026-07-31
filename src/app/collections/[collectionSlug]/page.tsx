import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { ProductCard } from "@/components/store/product-card";
import {
  findPublishedCollectionBySlug,
  listStoreProducts,
} from "@/modules/catalog/infrastructure/storefront-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

type Props = { params: Promise<{ collectionSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collectionSlug } = await params;
  const collection = await findPublishedCollectionBySlug(collectionSlug);
  if (!collection) return {};
  const canonicalPath = `/collections/${collection.slug}`;
  const description = collection.seoDescription ?? collection.description;
  return {
    title: collection.seoTitle ?? collection.name,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      description,
      images: [`${canonicalPath}/opengraph-image`],
      locale: "th_TH",
      siteName: "XCRUIZT",
      title: collection.name,
      type: "website",
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [`${canonicalPath}/opengraph-image`],
      title: collection.name,
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { collectionSlug } = await params;
  const [resolution, collection, products] = await Promise.all([
    getCurrentAccountResolution(),
    findPublishedCollectionBySlug(collectionSlug),
    listStoreProducts(collectionSlug),
  ]);
  if (!collection) notFound();
  return <main className="store-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={resolution} /></header><section className="store-shell"><p className="section-kicker">COLLECTION / {collection.slug}</p><h1>{collection.name}</h1><p className="store-intro">{collection.tagline ?? collection.description}</p>{products.length === 0 ? <div className="store-empty"><h2>ยังไม่มี Product ที่เปิดขาย</h2><p>Collection นี้ Published แล้ว แต่ยังไม่มี Active SKU</p></div> : <div className="store-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}</section></main>;
}
