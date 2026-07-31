export const ADMIN_PERMISSIONS = {
  writeProduct: "catalog.product.write",
  publishVersion: "catalog.version.publish",
  readOrders: "orders.read",
  refundPayment: "payments.refund",
  grantEntitlement: "entitlements.grant",
  manageDiscordSync: "discord.sync.manage",
  writeDiscordMapping: "discord.mapping.write",
  writeCoupon: "pricing.coupon.write",
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

export function hasAdminAccess(
  grantedPermissions: ReadonlySet<string>,
): boolean {
  return Object.values(ADMIN_PERMISSIONS).some((permission) =>
    grantedPermissions.has(permission),
  );
}
