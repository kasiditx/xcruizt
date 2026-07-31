export const CART_STORAGE_KEY = "xcruizt.cart.v1";
export const CART_UPDATED_EVENT = "xcruizt:cart-updated";

export type StoredCartItem = {
  name: string;
  quantity: number;
  skuId: string;
};

export function parseStoredCart(value: string): StoredCartItem[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredCartItem =>
        typeof item === "object" &&
        item !== null &&
        "skuId" in item &&
        typeof item.skuId === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "quantity" in item &&
        Number.isInteger(item.quantity) &&
        Number(item.quantity) >= 1 &&
        Number(item.quantity) <= 10,
    );
  } catch {
    return [];
  }
}

export function getStoredCartSnapshot(): string {
  return window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]";
}

export function getServerCartSnapshot(): string {
  return "[]";
}

export function subscribeToStoredCart(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CART_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CART_UPDATED_EVENT, onChange);
  };
}

export function readStoredCart(): StoredCartItem[] {
  return parseStoredCart(getStoredCartSnapshot());
}

export function writeStoredCart(items: StoredCartItem[]): void {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(items.slice(0, 20)),
  );
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addStoredCartItem(item: Omit<StoredCartItem, "quantity">) {
  const items = readStoredCart();
  const existing = items.find(({ skuId }) => skuId === item.skuId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, 10);
  } else {
    items.push({ ...item, quantity: 1 });
  }
  writeStoredCart(items);
}
