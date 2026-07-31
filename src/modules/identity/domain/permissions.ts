export const ADMIN_PERMISSIONS = {
  writeProduct: "catalog.product.write",
  publishVersion: "catalog.version.publish",
  readOrders: "orders.read",
  refundPayment: "payments.refund",
  grantEntitlement: "entitlements.grant",
  manageAdminRoles: "admin.roles.manage",
} as const;

export type AdminPermission =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export function hasRequiredPermission(
  grantedPermissions: ReadonlySet<string>,
  requiredPermission: AdminPermission,
): boolean {
  return grantedPermissions.has(requiredPermission);
}
