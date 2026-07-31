import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/modules/identity/domain/permissions";

const descriptions = {
  [ADMIN_PERMISSIONS.writeProduct]: "Create and update catalog products.",
  [ADMIN_PERMISSIONS.publishVersion]: "Publish product versions.",
  [ADMIN_PERMISSIONS.readOrders]: "Read customer orders.",
  [ADMIN_PERMISSIONS.refundPayment]: "Refund successful payments.",
  [ADMIN_PERMISSIONS.grantEntitlement]: "Grant customer entitlements.",
  [ADMIN_PERMISSIONS.manageAdminRoles]: "Manage Admin role assignments.",
} satisfies Record<AdminPermission, string>;

export const adminPermissionSeedRows = Object.values(ADMIN_PERMISSIONS).map(
  (code) => ({
    code,
    description: descriptions[code],
  }),
);
