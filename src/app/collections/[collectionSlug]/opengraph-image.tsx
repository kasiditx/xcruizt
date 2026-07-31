import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { findPublishedCollectionBySlug } from "@/modules/catalog/infrastructure/storefront-repository";

export const alt = "XCRUIZT ReShade collection";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

export default async function CollectionOpenGraphImage({
  params,
}: {
  params: Promise<{ collectionSlug: string }>;
}) {
  const { collectionSlug } = await params;
  const collection = await findPublishedCollectionBySlug(collectionSlug);
  if (!collection) notFound();

  return new ImageResponse(
    <div style={{ background: "linear-gradient(135deg,#08080b,#171525 55%,#302859)", color: "#f7f5fb", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: 64, width: "100%" }}>
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 10 }}>XCRUIZT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}><span style={{ color: "#b7a4ef", fontSize: 25, letterSpacing: 5 }}>COLLECTION</span><strong style={{ fontSize: 88, letterSpacing: -5 }}>{collection.name}</strong><span style={{ color: "#bbb7c5", fontSize: 30 }}>{(collection.tagline ?? collection.description).slice(0, 120)}</span></div>
      <span style={{ display: "flex", fontSize: 24 }}>ReShade presets for FiveM</span>
    </div>,
    size,
  );
}
