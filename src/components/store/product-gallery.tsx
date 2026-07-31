import Image from "next/image";

import { env } from "@/lib/env/server";
import { resolvePublicMediaSource } from "@/modules/catalog/application/media-url";
import type { StoreProductImage } from "@/modules/catalog/infrastructure/storefront-repository";

import { BeforeAfterSlider } from "./before-after-slider";

export function ProductGallery({
  images,
  productName,
}: {
  images: StoreProductImage[];
  productName: string;
}) {
  const approved = images.flatMap((image) => {
    const src = resolvePublicMediaSource(
      image.storageUrl,
      env.NEXT_PUBLIC_SITE_URL,
      env.NEXT_PUBLIC_MEDIA_ORIGIN,
    );
    return src ? [{ ...image, src }] : [];
  });
  const before = approved.find(({ imageRole }) => imageRole === "before");
  const after = approved.find(({ imageRole }) => imageRole === "after");
  const gallery = approved.filter(({ imageRole }) =>
    ["cover", "gallery", "thumbnail"].includes(imageRole),
  );

  if (before && after) {
    return (
      <div className="product-media-stack">
        <BeforeAfterSlider
          afterAlt={after.altText}
          afterSrc={after.src}
          beforeAlt={before.altText}
          beforeSrc={before.src}
          priority
        />
        {gallery.length > 0 ? (
          <div className="product-gallery" aria-label={`Gallery ${productName}`}>
            {gallery.map((image) => (
              <figure key={image.id}>
                <Image
                  alt={image.altText}
                  height={image.height}
                  sizes="(max-width: 700px) 50vw, 22vw"
                  src={image.src}
                  width={image.width}
                />
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const primary = gallery[0];
  if (!primary) {
    return (
      <div
        aria-label={`พื้นที่ภาพสินค้า ${productName}`}
        className="product-detail__visual product-detail__visual--fallback"
        role="img"
      >
        <span>{productName}</span>
      </div>
    );
  }

  return (
    <div className="product-media-stack">
      <figure className="product-gallery__hero">
        <Image
          alt={primary.altText}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 58vw"
          src={primary.src}
        />
      </figure>
      {gallery.length > 1 ? (
        <div className="product-gallery" aria-label={`Gallery ${productName}`}>
          {gallery.slice(1).map((image) => (
            <figure key={image.id}>
              <Image
                alt={image.altText}
                height={image.height}
                sizes="(max-width: 700px) 50vw, 22vw"
                src={image.src}
                width={image.width}
              />
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
