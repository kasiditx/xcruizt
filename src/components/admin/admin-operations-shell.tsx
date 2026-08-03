import type { ReactNode } from "react";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import type { CurrentAccount } from "@/modules/identity/application/current-account";

export function AdminOperationsShell({
  account,
  children,
  description,
  title,
}: {
  account: CurrentAccount;
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section className="admin-shell">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / OPERATIONS</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
