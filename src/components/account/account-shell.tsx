import type { ReactNode } from "react";
import Link from "next/link";

import type { CurrentAccount } from "@/modules/identity/application/current-account";
import { AccountControls } from "./account-controls";
import { AccountSectionNav } from "./account-section-nav";

export function AccountShell({
  account,
  children,
}: {
  account: CurrentAccount;
  children: ReactNode;
}) {
  return (
    <main className="account-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <AccountSectionNav />
      {children}
    </main>
  );
}
