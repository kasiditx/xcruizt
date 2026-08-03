import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/modules/identity/domain/permissions";

export type AdminNavigationIcon =
  | "activity"
  | "badge-dollar"
  | "boxes"
  | "cable"
  | "customers"
  | "dashboard"
  | "download"
  | "file-stack"
  | "folder"
  | "key"
  | "media"
  | "package"
  | "receipt"
  | "rotate"
  | "shield"
  | "tags";

export type AdminNavigationItem = {
  href: string;
  icon: AdminNavigationIcon;
  label: string;
  requiredAny?: AdminPermission[];
};

export type AdminNavigationGroup = {
  items: AdminNavigationItem[];
  label: string;
};

const navigationGroups: AdminNavigationGroup[] = [
  {
    label: "ภาพรวม",
    items: [
      { href: "/admin", icon: "dashboard", label: "Dashboard" },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        href: "/admin/catalog/collections",
        icon: "folder",
        label: "Collections",
        requiredAny: [ADMIN_PERMISSIONS.writeProduct],
      },
      {
        href: "/admin/catalog/products",
        icon: "boxes",
        label: "Products",
        requiredAny: [ADMIN_PERMISSIONS.writeProduct],
      },
      {
        href: "/admin/catalog/skus",
        icon: "package",
        label: "SKU และ Packages",
        requiredAny: [ADMIN_PERMISSIONS.writeProduct],
      },
      {
        href: "/admin/catalog/versions",
        icon: "file-stack",
        label: "Versions",
        requiredAny: [ADMIN_PERMISSIONS.writeProduct],
      },
      {
        href: "/admin/catalog/media",
        icon: "media",
        label: "Media",
        requiredAny: [ADMIN_PERMISSIONS.writeProduct],
      },
    ],
  },
  {
    label: "การขาย",
    items: [
      {
        href: "/admin/orders",
        icon: "receipt",
        label: "Orders",
        requiredAny: [ADMIN_PERMISSIONS.readOrders],
      },
      {
        href: "/admin/payments",
        icon: "badge-dollar",
        label: "Payments",
        requiredAny: [ADMIN_PERMISSIONS.readOrders],
      },
      {
        href: "/admin/refunds",
        icon: "rotate",
        label: "Refunds",
        requiredAny: [ADMIN_PERMISSIONS.refundPayment],
      },
      {
        href: "/admin/coupons",
        icon: "tags",
        label: "Coupons",
        requiredAny: [ADMIN_PERMISSIONS.writeCoupon],
      },
    ],
  },
  {
    label: "ลูกค้า",
    items: [
      {
        href: "/admin/customers",
        icon: "customers",
        label: "Customers",
        requiredAny: [ADMIN_PERMISSIONS.readOrders],
      },
      {
        href: "/admin/entitlements",
        icon: "key",
        label: "Entitlements",
        requiredAny: [ADMIN_PERMISSIONS.grantEntitlement],
      },
      {
        href: "/admin/downloads",
        icon: "download",
        label: "Downloads",
        requiredAny: [ADMIN_PERMISSIONS.readOrders],
      },
    ],
  },
  {
    label: "ระบบ",
    items: [
      {
        href: "/admin/webhooks",
        icon: "activity",
        label: "Webhooks",
        requiredAny: [ADMIN_PERMISSIONS.readOrders],
      },
      {
        href: "/admin/discord",
        icon: "cable",
        label: "Discord",
        requiredAny: [
          ADMIN_PERMISSIONS.manageDiscordSync,
          ADMIN_PERMISSIONS.writeDiscordMapping,
        ],
      },
      {
        href: "/admin/settings",
        icon: "shield",
        label: "Admin roles",
        requiredAny: [ADMIN_PERMISSIONS.manageAdminRoles],
      },
      { href: "/admin/mfa", icon: "shield", label: "MFA" },
      {
        href: "/admin/audit-logs",
        icon: "activity",
        label: "Audit logs",
        requiredAny: [ADMIN_PERMISSIONS.manageAdminRoles],
      },
    ],
  },
];

export function getAdminNavigationGroups(
  permissionCodes: readonly string[],
): AdminNavigationGroup[] {
  const permissions = new Set(permissionCodes);

  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.requiredAny ||
          item.requiredAny.some((permission) => permissions.has(permission)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
