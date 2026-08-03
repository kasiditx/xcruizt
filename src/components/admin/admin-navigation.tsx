"use client";

import {
  Activity,
  BadgeDollarSign,
  Boxes,
  Cable,
  Download,
  Files,
  FolderKanban,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  Menu,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Store,
  Tags,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  getAdminNavigationGroups,
  type AdminNavigationIcon,
} from "@/modules/administration/application/admin-navigation";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

const iconByName: Record<AdminNavigationIcon, LucideIcon> = {
  activity: Activity,
  "badge-dollar": BadgeDollarSign,
  boxes: Boxes,
  cable: Cable,
  customers: UsersRound,
  dashboard: LayoutDashboard,
  download: Download,
  "file-stack": Files,
  folder: FolderKanban,
  key: KeyRound,
  media: ImageIcon,
  package: PackageCheck,
  receipt: ReceiptText,
  rotate: RefreshCcw,
  shield: ShieldCheck,
  tags: Tags,
};

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationContent({
  onNavigate,
  permissionCodes,
  roleNames,
}: {
  onNavigate?: () => void;
  permissionCodes: readonly string[];
  roleNames: readonly string[];
}) {
  const pathname = usePathname();
  const groups = getAdminNavigationGroups(permissionCodes);
  const canWriteCatalog = permissionCodes.includes(
    ADMIN_PERMISSIONS.writeProduct,
  );

  return (
    <div className="admin-navigation__inner">
      <div className="admin-navigation__brand">
        <Link className="wordmark" href="/admin" onClick={onNavigate}>
          XCRUIZT<span>®</span>
        </Link>
        <p>Admin workspace</p>
        <span>{roleNames.join(" · ")}</span>
      </div>

      <nav aria-label="เมนูผู้ดูแลระบบ" className="admin-navigation__groups">
        {groups.map((group) => (
          <section aria-labelledby={`admin-nav-${group.label}`} key={group.label}>
            <h2 id={`admin-nav-${group.label}`}>{group.label}</h2>
            <ul>
              {group.items.map((item) => {
                const Icon = iconByName[item.icon];
                const current = isCurrentPath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      aria-current={current ? "page" : undefined}
                      className={current ? "is-current" : undefined}
                      href={item.href}
                      onClick={onNavigate}
                    >
                      <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="admin-navigation__footer">
        {canWriteCatalog ? (
          <div className="admin-navigation__quick-actions">
            <p>สร้างรายการใหม่</p>
            <Link href="/admin/catalog/products/new" onClick={onNavigate}>
              Product
            </Link>
            <Link href="/admin/catalog/skus/new" onClick={onNavigate}>
              SKU
            </Link>
          </div>
        ) : null}
        <Link className="admin-navigation__store-link" href="/" onClick={onNavigate}>
          <Store aria-hidden="true" size={16} />
          ดูหน้าร้าน
        </Link>
      </div>
    </div>
  );
}

export function AdminNavigation({
  permissionCodes,
  roleNames,
}: {
  permissionCodes: readonly string[];
  roleNames: readonly string[];
}) {
  const pathname = usePathname();
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    mobileDialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        aria-controls="admin-mobile-navigation"
        aria-label="เปิดเมนู Admin"
        className="admin-navigation__mobile-trigger"
        onClick={() => mobileDialogRef.current?.showModal()}
        type="button"
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      <aside className="admin-navigation admin-navigation--desktop">
        <NavigationContent
          permissionCodes={permissionCodes}
          roleNames={roleNames}
        />
      </aside>

      <dialog
        aria-label="เมนู Admin"
        className="admin-navigation-dialog"
        id="admin-mobile-navigation"
        onClick={(event) => {
          if (event.currentTarget === event.target) {
            event.currentTarget.close();
          }
        }}
        ref={mobileDialogRef}
      >
        <div className="admin-navigation admin-navigation--mobile">
          <button
            aria-label="ปิดเมนู Admin"
            className="admin-navigation__close"
            onClick={() => mobileDialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
          <NavigationContent
            onNavigate={() => mobileDialogRef.current?.close()}
            permissionCodes={permissionCodes}
            roleNames={roleNames}
          />
        </div>
      </dialog>
    </>
  );
}
