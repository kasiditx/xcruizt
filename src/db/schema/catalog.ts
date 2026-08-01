import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { profiles } from "./identity";

export const catalogStatus = pgEnum("catalog_status", [
  "draft",
  "published",
  "archived",
]);

export const skuType = pgEnum("sku_type", [
  "single",
  "collection",
  "bundle",
]);

export const skuStatus = pgEnum("sku_status", [
  "draft",
  "active",
  "inactive",
  "archived",
]);

export const grantPolicy = pgEnum("grant_policy", ["permanent"]);

export const productVersionStatus = pgEnum("product_version_status", [
  "draft",
  "published",
  "deprecated",
]);

export const fileRole = pgEnum("file_role", [
  "main_package",
  "installer",
  "guide",
  "checksum",
  "extra",
]);

export const storageProvider = pgEnum("storage_provider", ["r2"]);

export const fileStatus = pgEnum("file_status", [
  "staging",
  "active",
  "quarantined",
  "deleted",
]);

export const imageRole = pgEnum("image_role", [
  "cover",
  "gallery",
  "before",
  "after",
  "og",
  "thumbnail",
]);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    tagline: text("tagline"),
    description: text("description").notNull(),
    accentKey: text("accent_key"),
    coverImageId: uuid("cover_image_id").references(
      (): AnyPgColumn => productImages.id,
      { onDelete: "set null" },
    ),
    status: catalogStatus("status").default("draft").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    index("collections_cover_image_id_idx").on(table.coverImageId),
    index("collections_status_sort_order_idx").on(
      table.status,
      table.sortOrder,
    ),
    check("collections_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
  ],
).enableRLS();

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id").references(() => collections.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull(),
    mood: text("mood"),
    compatibility: jsonb("compatibility").notNull(),
    status: catalogStatus("status").default("draft").notNull(),
    brandName: text("brand_name").default("XCRUIZT").notNull(),
    schemaCategory: text("schema_category").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalPath: text("canonical_path"),
    isIndexable: boolean("is_indexable").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    index("products_collection_id_idx").on(table.collectionId),
    index("products_status_published_at_idx").on(
      table.status,
      table.publishedAt,
    ),
  ],
).enableRLS();

export const skus = pgTable(
  "skus",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skuCode: text("sku_code").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    skuType: skuType("sku_type").notNull(),
    priceSatang: integer("price_satang").notNull(),
    compareAtPriceSatang: integer("compare_at_price_satang"),
    currency: char("currency", { length: 3 }).default("THB").notNull(),
    status: skuStatus("status").default("draft").notNull(),
    purchaseLimit: integer("purchase_limit"),
    stripePriceId: text("stripe_price_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("skus_status_idx").on(table.status),
    check("skus_price_satang_nonnegative", sql`${table.priceSatang} >= 0`),
    check(
      "skus_compare_at_price_satang_nonnegative",
      sql`${table.compareAtPriceSatang} is null or ${table.compareAtPriceSatang} >= 0`,
    ),
    check(
      "skus_purchase_limit_positive",
      sql`${table.purchaseLimit} is null or ${table.purchaseLimit} > 0`,
    ),
  ],
).enableRLS();

export const skuProducts = pgTable(
  "sku_products",
  {
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    grantPolicy: grantPolicy("grant_policy").default("permanent").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.skuId, table.productId] }),
    index("sku_products_product_id_idx").on(table.productId),
  ],
).enableRLS();

export const productVersions = pgTable(
  "product_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    version: text("version").notNull(),
    status: productVersionStatus("status").default("draft").notNull(),
    changelogMd: text("changelog_md").notNull(),
    releaseNotesMd: text("release_notes_md"),
    isCurrent: boolean("is_current").default(false).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("product_versions_product_id_version_unique").on(
      table.productId,
      table.version,
    ),
    uniqueIndex("product_versions_current_product_unique")
      .on(table.productId)
      .where(sql`${table.isCurrent} = true`),
    index("product_versions_created_by_idx").on(table.createdBy),
    index("product_versions_status_released_at_idx").on(
      table.status,
      table.releasedAt,
    ),
  ],
).enableRLS();

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productVersionId: uuid("product_version_id").references(
      () => productVersions.id,
    ),
    skuId: uuid("sku_id").references(() => skus.id),
    fileRole: fileRole("file_role").notNull(),
    storageProvider: storageProvider("storage_provider")
      .default("r2")
      .notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    contentType: text("content_type").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    status: fileStatus("status").default("staging").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("files_product_version_id_idx").on(table.productVersionId),
    index("files_sku_id_idx").on(table.skuId),
    index("files_status_idx").on(table.status),
    uniqueIndex("files_sku_main_package_active_unique")
      .on(table.skuId)
      .where(
        sql`${table.skuId} is not null and ${table.fileRole} = 'main_package' and ${table.status} = 'active'`,
      ),
    check(
      "files_single_owner",
      sql`num_nonnulls(${table.productVersionId}, ${table.skuId}) = 1`,
    ),
    check(
      "files_file_size_bytes_nonnegative",
      sql`${table.fileSizeBytes} >= 0`,
    ),
    check(
      "files_sha256_format",
      sql`${table.sha256} ~ '^[0-9a-fA-F]{64}$'`,
    ),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id),
    collectionId: uuid("collection_id").references(() => collections.id),
    imageRole: imageRole("image_role").notNull(),
    storageUrl: text("storage_url").notNull(),
    altText: text("alt_text").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurDataUrl: text("blur_data_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSchemaImage: boolean("is_schema_image").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
    index("product_images_collection_id_idx").on(table.collectionId),
    check(
      "product_images_single_owner",
      sql`num_nonnulls(${table.productId}, ${table.collectionId}) = 1`,
    ),
    check("product_images_width_positive", sql`${table.width} > 0`),
    check("product_images_height_positive", sql`${table.height} > 0`),
    check(
      "product_images_sort_order_nonnegative",
      sql`${table.sortOrder} >= 0`,
    ),
  ],
).enableRLS();
