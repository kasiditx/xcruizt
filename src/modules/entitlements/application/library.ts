export type LibraryEntitlementRow = {
  changelogMd: string | null;
  collectionName: string | null;
  entitlementId: string;
  grantedAt: Date;
  productId: string;
  productName: string;
  productSlug: string;
  releaseNotesMd: string | null;
  shortDescription: string;
  status: "active" | "revoked";
  version: string | null;
};

export type LibraryItem = Omit<LibraryEntitlementRow, "status">;

export function buildLibraryItems(
  rows: readonly LibraryEntitlementRow[],
): LibraryItem[] {
  return rows
    .filter(({ status }) => status === "active")
    .map(
      ({
        collectionName,
        changelogMd,
        entitlementId,
        grantedAt,
        productId,
        productName,
        productSlug,
        releaseNotesMd,
        shortDescription,
        version,
      }) => ({
        changelogMd,
        collectionName,
        entitlementId,
        grantedAt,
        productId,
        productName,
        productSlug,
        releaseNotesMd,
        shortDescription,
        version,
      }),
    );
}
