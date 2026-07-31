import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/modules/identity/domain/permissions";

export type AdminRoleSeedRow = {
  name: string;
  description: string;
  permissions: readonly AdminPermission[];
};

export const adminRoleSeedRows = [
  {
    name: "Support",
    description: "Read-only customer order support.",
    permissions: [
      ADMIN_PERMISSIONS.readOrders,
      ADMIN_PERMISSIONS.manageDiscordSync,
    ],
  },
  {
    name: "Catalog Manager",
    description: "Manage products and publish product versions.",
    permissions: [
      ADMIN_PERMISSIONS.writeProduct,
      ADMIN_PERMISSIONS.publishVersion,
    ],
  },
  {
    name: "Finance Admin",
    description: "Review orders and refund successful payments.",
    permissions: [
      ADMIN_PERMISSIONS.readOrders,
      ADMIN_PERMISSIONS.refundPayment,
    ],
  },
  {
    name: "Super Admin",
    description: "Manage every currently defined administrative capability.",
    permissions: Object.values(ADMIN_PERMISSIONS),
  },
] as const satisfies readonly AdminRoleSeedRow[];
