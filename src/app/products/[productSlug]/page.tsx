import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { ProductGallery } from "@/components/store/product-gallery";
import { env } from "@/lib/env/server";
import { resolvePublicMediaSource } from "@/modules/catalog/application/media-url";
import { formatThaiBaht } from "@/modules/catalog/application/price";
import { findStoreProductBySlug } from "@/modules/catalog/infrastructure/storefront-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

type Props = { params: Promise<{ productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await findStoreProductBySlug(productSlug);
  if (!product) return {};
  const canonicalPath = `/products/${product.slug}`;
  const description = product.seoDescription ?? product.shortDescription;
  const ogImage = product.images.find(({ imageRole }) => imageRole === "og");
  const approvedOgImage = ogImage
    ? resolvePublicMediaSource(
        ogImage.storageUrl,
        env.NEXT_PUBLIC_SITE_URL,
        env.NEXT_PUBLIC_MEDIA_ORIGIN,
      )
    : null;
  const socialImage =
    approvedOgImage ?? `${canonicalPath}/opengraph-image`;
  return {
    title: product.seoTitle ?? product.name,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      description,
      images: [
        {
          alt: `${product.name} by XCRUIZT`,
          height: ogImage?.height ?? 630,
          url: socialImage,
          width: ogImage?.width ?? 1200,
        },
      ],
      locale: "th_TH",
      siteName: "XCRUIZT",
      title: product.name,
      type: "website",
      url: canonicalPath,
    },
    robots: {
      follow: product.isIndexable,
      index: product.isIndexable,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [socialImage],
      title: product.name,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { productSlug } = await params;
  const [resolution, product] = await Promise.all([
    getCurrentAccountResolution(),
    findStoreProductBySlug(productSlug),
  ]);
  if (!product) notFound();

  const lowestSku = product.skus[0];
  const canonicalUrl = new URL(
    `/products/${product.slug}`,
    env.NEXT_PUBLIC_SITE_URL,
  ).toString();
  const schemaImages = product.images.flatMap((image) => {
    const source = resolvePublicMediaSource(
      image.storageUrl,
      env.NEXT_PUBLIC_SITE_URL,
      env.NEXT_PUBLIC_MEDIA_ORIGIN,
    );
    return source
      ? [new URL(source, env.NEXT_PUBLIC_SITE_URL).toString()]
      : [];
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    brand: { "@type": "Brand", name: product.brandName },
    category: product.schemaCategory,
    description: product.shortDescription,
    image: schemaImages.length > 0 ? schemaImages : undefined,
    name: product.name,
    offers: lowestSku
      ? {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          price: (lowestSku.priceSatang / 100).toFixed(2),
          priceCurrency: lowestSku.currency,
          url: canonicalUrl,
        }
      : undefined,
    url: canonicalUrl,
  };

  return (
    <main className="store-page">
      <header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={resolution} /></header>
      <article className="product-detail">
        <ProductGallery images={product.images} productName={product.name} />
        <div className="product-detail__content">
          <p className="section-kicker">{product.collectionName ?? product.brandName}</p>
          <h1>{product.name}</h1>
          <p className="product-detail__summary">{product.shortDescription}</p>
          <div className="product-detail__description">{product.description}</div>
          <section className="purchase-options" aria-labelledby="purchase-title">
            <h2 id="purchase-title">ตัวเลือกที่เปิดขาย</h2>
            {product.skus.map((sku) => (
              <div key={sku.id}>
                <span><strong>{sku.name}</strong><small>{sku.skuType}</small></span>
                <strong>{formatThaiBaht(sku.priceSatang)}</strong>
                <AddToCartButton name={sku.name} skuId={sku.id} />
              </div>
            ))}
            <p>Cart และ Stripe Checkout จะใช้ SKU ID และโหลดราคาจาก Server ใหม่ทุกครั้ง</p>
          </section>
        </div>
      </article>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
        type="application/ld+json"
      />
    </main>
  );
}
