import Link from "next/link";
import Image from "next/image";

import { env } from "@/lib/env/server";
import { resolvePublicMediaSource } from "@/modules/catalog/application/media-url";
import { formatThaiBaht } from "@/modules/catalog/application/price";
import type { StoreProduct } from "@/modules/catalog/infrastructure/storefront-repository";

export function ProductCard({ product }: { product: StoreProduct }) {
  const lowestPrice = product.skus[0]?.priceSatang;
  const cover = product.images.find(({ imageRole }) =>
    ["thumbnail", "cover"].includes(imageRole),
  );
  const coverSrc = cover
    ? resolvePublicMediaSource(
        cover.storageUrl,
        env.NEXT_PUBLIC_SITE_URL,
        env.NEXT_PUBLIC_MEDIA_ORIGIN,
      )
    : null;

  return (
    <article className="store-product-card">
      <div className="store-product-card__visual">
        {cover && coverSrc ? (
          <Image
            alt={cover.altText}
            fill
            sizes="(max-width: 760px) 100vw, 33vw"
            src={coverSrc}
          />
        ) : (
          <span>{product.mood ?? product.collectionName ?? "XCRUIZT"}</span>
        )}
      </div>
      <div className="store-product-card__body">
        <p>{product.collectionName ?? product.brandName}</p>
        <h2>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <span>{product.shortDescription}</span>
        <div>
          <strong>
            {lowestPrice === undefined
              ? "ยังไม่เปิดขาย"
              : `เริ่ม ${formatThaiBaht(lowestPrice)}`}
          </strong>
          <Link href={`/products/${product.slug}`}>ดูรายละเอียด</Link>
        </div>
      </div>
    </article>
  );
}
