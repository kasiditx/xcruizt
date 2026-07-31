import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { adminAuditLogs, collections } from "@/db/schema";
import type { CollectionInput } from "../application/collection-input";

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  accentKey: string | null;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export async function listAdminCollections(): Promise<AdminCollection[]> {
  return db
    .select({
      accentKey: collections.accentKey,
      description: collections.description,
      id: collections.id,
      name: collections.name,
      publishedAt: collections.publishedAt,
      seoDescription: collections.seoDescription,
      seoTitle: collections.seoTitle,
      slug: collections.slug,
      sortOrder: collections.sortOrder,
      status: collections.status,
      tagline: collections.tagline,
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .orderBy(asc(collections.sortOrder), asc(collections.name));
}

export async function findAdminCollectionById(
  collectionId: string,
): Promise<AdminCollection | null> {
  const [collection] = await db
    .select({
      accentKey: collections.accentKey,
      description: collections.description,
      id: collections.id,
      name: collections.name,
      publishedAt: collections.publishedAt,
      seoDescription: collections.seoDescription,
      seoTitle: collections.seoTitle,
      slug: collections.slug,
      sortOrder: collections.sortOrder,
      status: collections.status,
      tagline: collections.tagline,
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  return collection ?? null;
}

export async function createAdminCollection(
  input: CollectionInput,
  adminUserId: string,
): Promise<string> {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [created] = await transaction
      .insert(collections)
      .values({
        ...input,
        publishedAt: input.status === "published" ? now : null,
        updatedAt: now,
      })
      .returning({ id: collections.id });

    if (!created) {
      throw new Error("Collection insert returned no identifier.");
    }

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.collection.create",
      adminUserId,
      afterData: {
        ...input,
        id: created.id,
      },
      entityId: created.id,
      entityType: "collection",
    });

    return created.id;
  });
}

export async function updateAdminCollection(
  collectionId: string,
  input: CollectionInput,
  adminUserId: string,
): Promise<"updated" | "not_found"> {
  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!existing) {
      return "not_found";
    }

    const now = new Date();
    const publishedAt =
      input.status === "published"
        ? (existing.publishedAt ?? now)
        : existing.publishedAt;

    await transaction
      .update(collections)
      .set({
        ...input,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(collections.id, collectionId));

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.collection.update",
      adminUserId,
      afterData: {
        ...input,
        id: collectionId,
        publishedAt,
      },
      beforeData: existing,
      entityId: collectionId,
      entityType: "collection",
    });

    return "updated";
  });
}
