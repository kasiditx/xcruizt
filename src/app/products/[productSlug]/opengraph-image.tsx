import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { formatThaiBaht } from "@/modules/catalog/application/price";
import { findStoreProductBySlug } from "@/modules/catalog/infrastructure/storefront-repository";

export const alt = "XCRUIZT ReShade preset";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

export default async function ProductOpenGraphImage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const product = await findStoreProductBySlug(productSlug);
  if (!product) notFound();
  const price = product.skus[0]?.priceSatang;

  return new ImageResponse(
    <div
      style={{
        background:
          "linear-gradient(135deg, #08080b 0%, #171525 58%, #242044 100%)",
        color: "#f7f5fb",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 8 }}>
        XCRUIZT
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <span style={{ color: "#b7a4ef", fontSize: 24, letterSpacing: 5 }}>
          {product.collectionName ?? "FIVEM / RESHADE"}
        </span>
        <strong style={{ fontSize: 76, letterSpacing: -4, lineHeight: 1 }}>
          {product.name}
        </strong>
        <span style={{ color: "#b8b5c0", fontSize: 28 }}>
          {product.shortDescription.slice(0, 110)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
        <span>RESHade for FiveM</span>
        <span>{price === undefined ? "Available soon" : `เริ่ม ${formatThaiBaht(price)}`}</span>
      </div>
    </div>,
    size,
  );
}
