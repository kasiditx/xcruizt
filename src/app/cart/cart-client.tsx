"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { formatThaiBaht } from "@/modules/catalog/application/price";
import {
  getServerCartSnapshot,
  getStoredCartSnapshot,
  parseStoredCart,
  subscribeToStoredCart,
  type StoredCartItem,
  writeStoredCart,
} from "@/modules/checkout/client/cart-storage";

type Quote = {
  currency: "THB";
  discountSatang: number;
  lines: Array<{
    lineTotalSatang: number;
    productNameSnapshot: string;
    quantity: number;
    skuId: string;
    unitPriceSatang: number;
  }>;
  subtotalSatang: number;
  totalSatang: number;
  warnings: string[];
};

export function CartClient({ authenticated }: { authenticated: boolean }) {
  const cartSnapshot = useSyncExternalStore(
    subscribeToStoredCart,
    getStoredCartSnapshot,
    getServerCartSnapshot,
  );
  const items = useMemo(
    () => parseStoredCart(cartSnapshot),
    [cartSnapshot],
  );
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const checkoutRequestId = useRef<string | null>(null);

  const requestQuote = useCallback(
    async (cartItems: StoredCartItem[], coupon: string) => {
      if (!authenticated || cartItems.length === 0) {
        setLoading(false);
        setQuote(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/checkout/quote", {
          body: JSON.stringify({
            couponCode: coupon || undefined,
            items: cartItems.map(({ quantity, skuId }) => ({
              quantity,
              skuId,
            })),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const payload: unknown = await response.json();
        if (
          !response.ok ||
          typeof payload !== "object" ||
          payload === null ||
          !("data" in payload)
        ) {
          setQuote(null);
          setError("ราคาใน Cart ใช้งานไม่ได้ กรุณาตรวจรายการอีกครั้ง");
          return;
        }
        setQuote(payload.data as Quote);
      } catch {
        setQuote(null);
        setError("เชื่อมต่อระบบตรวจราคาไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [authenticated],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void requestQuote(items, "");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [items, requestQuote]);

  function updateItems(next: StoredCartItem[]) {
    checkoutRequestId.current = null;
    writeStoredCart(next);
    void requestQuote(next, couponCode);
  }

  function changeQuantity(skuId: string, delta: number) {
    updateItems(
      items.map((item) =>
        item.skuId === skuId
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(10, item.quantity + delta),
              ),
            }
          : item,
      ),
    );
  }

  function applyCoupon(event: FormEvent) {
    event.preventDefault();
    checkoutRequestId.current = null;
    void requestQuote(items, couponCode.trim());
  }

  async function startCheckout() {
    if (!quote || checkoutPending) return;
    setCheckoutPending(true);
    setError("");
    checkoutRequestId.current ??= window.crypto.randomUUID();

    try {
      const response = await fetch("/api/checkout/session", {
        body: JSON.stringify({
          checkoutRequestId: checkoutRequestId.current,
          couponCode: couponCode.trim() || undefined,
          items: items.map(({ quantity, skuId }) => ({
            quantity,
            skuId,
          })),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json();
      if (
        !response.ok ||
        typeof payload !== "object" ||
        payload === null ||
        !("data" in payload) ||
        typeof payload.data !== "object" ||
        payload.data === null ||
        !("checkoutUrl" in payload.data) ||
        typeof payload.data.checkoutUrl !== "string"
      ) {
        setError(
          response.status === 503
            ? "Stripe ยังไม่ได้ตั้งค่าใน Environment"
            : "สร้างหน้าชำระเงินไม่สำเร็จ กรุณาลองใหม่",
        );
        return;
      }

      const checkoutUrl = new URL(payload.data.checkoutUrl);
      if (checkoutUrl.protocol !== "https:") {
        throw new Error("Checkout URL must use HTTPS.");
      }
      window.location.assign(checkoutUrl.href);
    } catch {
      setError("เชื่อมต่อระบบชำระเงินไม่สำเร็จ");
    } finally {
      setCheckoutPending(false);
    }
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="store-empty">
        <h2>Cart ยังว่าง</h2>
        <p>เลือก Active SKU จาก Product ที่เปิดขายก่อน</p>
        <Link className="primary-action" href="/shop">ไปที่ Shop</Link>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <section aria-labelledby="cart-items-title">
        <h2 id="cart-items-title">รายการสินค้า</h2>
        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.skuId}>
              <div><strong>{item.name}</strong><span>{item.skuId}</span></div>
              <div className="cart-quantity">
                <button aria-label={`ลดจำนวน ${item.name}`} onClick={() => changeQuantity(item.skuId, -1)} type="button"><Minus size={14} /></button>
                <span>{item.quantity}</span>
                <button aria-label={`เพิ่มจำนวน ${item.name}`} onClick={() => changeQuantity(item.skuId, 1)} type="button"><Plus size={14} /></button>
              </div>
              <button aria-label={`ลบ ${item.name}`} className="cart-remove" onClick={() => updateItems(items.filter(({ skuId }) => skuId !== item.skuId))} type="button"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="cart-summary">
        <h2>สรุปราคา</h2>
        {!authenticated ? (
          <div className="cart-auth-required"><p>เข้าสู่ระบบเพื่อให้ Server ตรวจราคาและสิทธิ์</p><Link className="primary-action" href="/auth/login?next=/cart">เข้าสู่ระบบ</Link></div>
        ) : (
          <>
            <form onSubmit={applyCoupon}><label htmlFor="coupon">Coupon code</label><div><input id="coupon" onChange={(event) => setCouponCode(event.target.value)} value={couponCode} /><button disabled={loading} type="submit">ตรวจสอบ</button></div></form>
            {error ? <p className="cart-error" role="alert">{error}</p> : null}
            {loading ? <p role="status">กำลังตรวจราคาจาก Server...</p> : null}
            {quote ? <><dl><div><dt>Subtotal</dt><dd>{formatThaiBaht(quote.subtotalSatang)}</dd></div><div><dt>Discount</dt><dd>-{formatThaiBaht(quote.discountSatang)}</dd></div><div><dt>Total</dt><dd>{formatThaiBaht(quote.totalSatang)}</dd></div></dl>{quote.warnings.length ? <p className="cart-warning">Cart มี Product ที่เป็นเจ้าของแล้วหรือซ้ำกับ Bundle อื่น กรุณาตรวจสอบก่อนชำระเงิน</p> : null}<button className="primary-action" disabled={checkoutPending || loading} onClick={() => void startCheckout()} type="button">{checkoutPending ? "กำลังเปิด Stripe..." : "ชำระผ่าน Stripe PromptPay / Card"}</button></> : null}
          </>
        )}
      </aside>
    </div>
  );
}
