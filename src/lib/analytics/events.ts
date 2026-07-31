import { z } from "zod";

const uuid = z.uuid();
const skuType = z.enum(["single", "collection", "bundle"]);
const priceBucket = z.enum([
  "free",
  "under_100",
  "100_499",
  "500_999",
  "1000_plus",
]);

const event = <
  const Name extends string,
  Shape extends z.ZodRawShape,
>(name: Name, shape: Shape) =>
  z.strictObject({
    name: z.literal(name),
    properties: z.strictObject(shape),
  });

export const analyticsEventSchema = z.discriminatedUnion("name", [
  event("store_viewed", {}),
  event("collection_viewed", { collectionId: uuid }),
  event("product_viewed", {
    collectionId: uuid.optional(),
    productId: uuid,
  }),
  event("before_after_used", { productId: uuid }),
  event("add_to_cart", {
    priceBucket,
    skuId: uuid,
    skuType,
  }),
  event("cart_viewed", { itemCount: z.int().min(0).max(100) }),
  event("coupon_applied", { accepted: z.boolean() }),
  event("checkout_started", {
    itemCount: z.int().min(1).max(100),
    totalBucket: priceBucket,
  }),
  event("checkout_completed", {
    itemCount: z.int().min(1).max(100),
    totalBucket: priceBucket,
  }),
  event("library_viewed", {}),
  event("download_requested", { productId: uuid }),
  event("download_completed_client_signal", { productId: uuid }),
  event("discord_connected", {}),
]);

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsEventName = AnalyticsEvent["name"];

export function parseAnalyticsEvent(input: unknown): AnalyticsEvent {
  return analyticsEventSchema.parse(input);
}
