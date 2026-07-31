"use client";

import { ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addStoredCartItem } from "@/modules/checkout/client/cart-storage";

export function AddToCartButton({
  name,
  skuId,
}: {
  name: string;
  skuId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="purchase-add"
      disabled={pending}
      onClick={() => {
        setPending(true);
        addStoredCartItem({ name, skuId });
        router.push("/cart");
      }}
      type="button"
    >
      <ShoppingBag aria-hidden="true" size={16} />
      {pending ? "กำลังเปิด Cart..." : "เพิ่มลง Cart"}
    </button>
  );
}
