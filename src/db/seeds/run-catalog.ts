import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { config } from "dotenv";

import { createDatabaseConnection } from "@/db/connection";
import {
  adminAuditLogs,
  adminRoles,
  adminUserRoles,
  collections,
  productVersions,
  products,
  profiles,
  skuProducts,
  skus,
} from "@/db/schema";
import { parseDatabaseRuntimeEnvironment } from "@/lib/env/database";

import {
  catalogSeedCollections,
  catalogSeedProducts,
  catalogSeedSkus,
  catalogSeedVersions,
} from "./catalog";

config({ path: ".env.local", quiet: true });

const { DATABASE_URL } = parseDatabaseRuntimeEnvironment(process.env);
const connection = createDatabaseConnection(DATABASE_URL);

async function main(): Promise<void> {
  try {
    const result = await connection.db.transaction(async (transaction) => {
      const [admin] = await transaction
        .select({
          id: profiles.id,
        })
        .from(profiles)
        .innerJoin(adminUserRoles, eq(adminUserRoles.userId, profiles.id))
        .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
        .where(eq(adminRoles.name, "Super Admin"))
        .orderBy(asc(profiles.createdAt))
        .limit(1);

      if (!admin) {
        throw new Error(
          "No Super Admin profile found. Seed authorization before catalog data.",
        );
      }

      const createdCollections = await transaction
        .insert(collections)
        .values(
          catalogSeedCollections.map((collection) => ({
            description: collection.description,
            name: collection.name,
            slug: collection.slug,
            sortOrder: collection.sortOrder,
            status: "draft" as const,
            tagline: collection.tagline,
          })),
        )
        .onConflictDoNothing({ target: collections.slug })
        .returning({ id: collections.id, slug: collections.slug });

      const persistedCollections = await transaction
        .select({ id: collections.id, slug: collections.slug })
        .from(collections);
      const collectionIdBySlug = new Map(
        persistedCollections.map(({ id, slug }) => [slug, id]),
      );

      const updatedCollectionTaglines = [] as Array<{
        id: string;
        slug: string;
        tagline: string;
      }>;
      for (const collection of catalogSeedCollections) {
        const collectionId = collectionIdBySlug.get(collection.slug);
        if (!collectionId) {
          throw new Error(`Missing collection ${collection.slug}.`);
        }

        const [updated] = await transaction
          .update(collections)
          .set({ tagline: collection.tagline, updatedAt: new Date() })
          .where(
            and(
              eq(collections.id, collectionId),
              isNull(collections.tagline),
            ),
          )
          .returning({ id: collections.id });

        if (updated) {
          updatedCollectionTaglines.push({
            id: updated.id,
            slug: collection.slug,
            tagline: collection.tagline,
          });
        }
      }

      for (const product of catalogSeedProducts) {
        if (!collectionIdBySlug.has(product.collectionSlug)) {
          throw new Error(
            `Missing collection for ${product.collectionSlug}.`,
          );
        }
      }

      const createdProducts = await transaction
        .insert(products)
        .values(
          catalogSeedProducts.map((product) => ({
            brandName: "XCRUIZT",
            canonicalPath: `/products/${product.slug}`,
            collectionId: collectionIdBySlug.get(product.collectionSlug)!,
            compatibility: {
              platform: "FiveM",
              renderer: "ReShade",
            },
            description: `${product.name} ReShade preset for FiveM.`,
            isIndexable: false,
            name: product.name,
            schemaCategory: "FiveM ReShade Preset",
            shortDescription: `${product.name} ReShade preset for FiveM.`,
            slug: product.slug,
            status: "draft" as const,
          })),
        )
        .onConflictDoNothing({ target: products.slug })
        .returning({ id: products.id, slug: products.slug });

      const persistedProducts = await transaction
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .where(
          inArray(
            products.slug,
            catalogSeedProducts.map((product) => product.slug),
          ),
        );
      const productIdBySlug = new Map(
        persistedProducts.map(({ id, slug }) => [slug, id]),
      );

      for (const version of catalogSeedVersions) {
        if (!productIdBySlug.has(version.productSlug)) {
          throw new Error(`Missing product ${version.productSlug}.`);
        }
      }

      const createdSkus = await transaction
        .insert(skus)
        .values(
          catalogSeedSkus.map((sku) => ({
            compareAtPriceSatang: sku.compareAtPriceSatang,
            currency: "THB",
            name: sku.name,
            priceSatang: sku.priceSatang,
            purchaseLimit: 1,
            skuCode: sku.skuCode,
            skuType: sku.skuType,
            slug: sku.slug,
            status: "draft" as const,
          })),
        )
        .onConflictDoNothing({ target: skus.skuCode })
        .returning({ id: skus.id, skuCode: skus.skuCode });

      const persistedSkus = await transaction
        .select({ id: skus.id, skuCode: skus.skuCode })
        .from(skus)
        .where(
          inArray(
            skus.skuCode,
            catalogSeedSkus.map((sku) => sku.skuCode),
          ),
        );
      const skuIdByCode = new Map(
        persistedSkus.map(({ id, skuCode }) => [skuCode, id]),
      );

      const grantRows = catalogSeedSkus.flatMap((sku) => {
        const skuId = skuIdByCode.get(sku.skuCode);
        if (!skuId) {
          throw new Error(`Missing SKU ${sku.skuCode}.`);
        }

        return sku.productSlugs.map((productSlug) => {
          const productId = productIdBySlug.get(productSlug);
          if (!productId) {
            throw new Error(`Missing product ${productSlug}.`);
          }

          return { productId, skuId };
        });
      });

      const createdGrants = await transaction
        .insert(skuProducts)
        .values(grantRows)
        .onConflictDoNothing({
          target: [skuProducts.skuId, skuProducts.productId],
        })
        .returning({ productId: skuProducts.productId, skuId: skuProducts.skuId });

      const createdVersions = await transaction
        .insert(productVersions)
        .values(
          catalogSeedVersions.map((version) => ({
            changelogMd: version.changelogMd,
            createdBy: admin.id,
            productId: productIdBySlug.get(version.productSlug)!,
            releaseNotesMd: version.releaseNotesMd,
            status: "draft" as const,
            version: version.version,
          })),
        )
        .onConflictDoNothing({
          target: [productVersions.productId, productVersions.version],
        })
        .returning({ id: productVersions.id, version: productVersions.version });

      const auditRows = [
        ...createdCollections.map(({ id, slug }) => ({
          action: "catalog.seed.collection.create",
          afterData: { id, slug, status: "draft" },
          adminUserId: admin.id,
          entityId: id,
          entityType: "collection",
        })),
        ...updatedCollectionTaglines.map(({ id, slug, tagline }) => ({
          action: "catalog.seed.collection.tagline.update",
          afterData: { id, slug, tagline },
          adminUserId: admin.id,
          entityId: id,
          entityType: "collection",
        })),
        ...createdProducts.map(({ id, slug }) => ({
          action: "catalog.seed.product.create",
          afterData: { id, slug, status: "draft" },
          adminUserId: admin.id,
          entityId: id,
          entityType: "product",
        })),
        ...createdSkus.map(({ id, skuCode }) => ({
          action: "catalog.seed.sku.create",
          afterData: { id, skuCode, status: "draft" },
          adminUserId: admin.id,
          entityId: id,
          entityType: "sku",
        })),
        ...createdGrants.map(({ productId, skuId }) => ({
          action: "catalog.seed.sku_grant.create",
          afterData: { productId, skuId },
          adminUserId: admin.id,
          entityId: skuId,
          entityType: "sku_product",
        })),
        ...createdVersions.map(({ id, version }) => ({
          action: "catalog.seed.version.create",
          afterData: { id, status: "draft", version },
          adminUserId: admin.id,
          entityId: id,
          entityType: "product_version",
        })),
      ];

      if (auditRows.length > 0) {
        await transaction.insert(adminAuditLogs).values(auditRows);
      }

      return {
        createdCollections: createdCollections.length,
        createdProducts: createdProducts.length,
        existingCollections:
          catalogSeedCollections.length - createdCollections.length,
        existingProducts:
          catalogSeedProducts.length - createdProducts.length,
        createdSkus: createdSkus.length,
        existingSkus: catalogSeedSkus.length - createdSkus.length,
        createdGrants: createdGrants.length,
        existingGrants: grantRows.length - createdGrants.length,
        createdVersions: createdVersions.length,
        existingVersions: catalogSeedVersions.length - createdVersions.length,
        updatedCollectionTaglines: updatedCollectionTaglines.length,
      };
    });

    console.log(
      JSON.stringify({
        ...result,
        status: "draft",
      }),
    );
  } finally {
    await connection.close();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Failed to seed catalog.",
  );
  process.exitCode = 1;
});
