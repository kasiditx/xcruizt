import {
  CircleUserRound,
  LayoutDashboard,
  Library,
  LogOut,
  MessagesSquare,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/account/actions";
import type { CurrentAccountResolution } from "@/modules/identity/application/current-account";

type AccountControlsProps = {
  resolution: CurrentAccountResolution;
};

export function AccountControls({ resolution }: AccountControlsProps) {
  if (resolution.status === "anonymous") {
    return (
      <Link className="account-link" href="/auth/login">
        <CircleUserRound aria-hidden="true" size={18} strokeWidth={1.7} />
        <span>เข้าสู่ระบบ</span>
      </Link>
    );
  }

  if (resolution.status === "profile_required") {
    return (
      <div className="account-controls">
        <Link
          className="account-controls__link"
          href="/auth/complete-profile"
        >
          <UserRoundCog aria-hidden="true" size={16} />
          ตั้งค่า Username
        </Link>
        <form action={signOut}>
          <button className="account-signout" type="submit">
            <LogOut aria-hidden="true" size={15} />
            ออกจากระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <nav className="account-controls" aria-label="เมนูบัญชี">
      {resolution.account.admin.isAdmin ? (
        <Link className="account-controls__link" href="/admin">
          <LayoutDashboard aria-hidden="true" size={16} />
          Admin
        </Link>
      ) : null}
      <Link
        className="account-controls__link"
        href="/account/library"
      >
        <Library aria-hidden="true" size={16} />
        Library
      </Link>
      <Link
        className="account-controls__link"
        href="/account/discord"
      >
        <MessagesSquare aria-hidden="true" size={16} />
        Discord
      </Link>
      <Link
        className="account-controls__identity"
        href="/account/profile"
      >
        @{resolution.account.username}
      </Link>
      <form action={signOut}>
        <button className="account-signout" type="submit">
          <LogOut aria-hidden="true" size={15} />
          ออกจากระบบ
        </button>
      </form>
    </nav>
  );
}
