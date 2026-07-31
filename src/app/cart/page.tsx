import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

import { CartClient } from "./cart-client";

export const metadata: Metadata = {
  title: "Cart",
  robots: { follow: false, index: false },
};

export default async function CartPage() {
  const resolution = await getCurrentAccountResolution();
  return <main className="store-page"><header className="account-header"><Link className="wordmark" href="/">XCRUIZT<span>®</span></Link><AccountControls resolution={resolution} /></header><section className="store-shell"><p className="section-kicker">CHECKOUT / SERVER-VALIDATED</p><h1>Cart</h1><CartClient authenticated={resolution.status === "ready"} /></section></main>;
}
