/** Client-side quote request cart (localStorage) */

export type QuoteCartItem = {
  productId?: string;
  productName: string;
  sku?: string;
  qty: string;
  imageUrl?: string;
  slug?: string;
};

const KEY = "reagent_quote_cart_v1";

export function loadQuoteCart(): QuoteCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveQuoteCart(items: QuoteCartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("reagent-cart-change"));
}

export function cartCount(items?: QuoteCartItem[]) {
  const list = items ?? loadQuoteCart();
  return list.reduce((s, i) => s + Math.max(1, Number(i.qty) || 1), 0);
}

export function addToQuoteCart(item: QuoteCartItem) {
  const items = loadQuoteCart();
  const idx = items.findIndex(
    (x) =>
      (item.productId && x.productId === item.productId) ||
      (!item.productId &&
        x.productName === item.productName &&
        x.sku === item.sku)
  );
  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      ...item,
      qty: String(
        Math.max(1, Number(items[idx].qty || 1) + Number(item.qty || 1))
      ),
    };
  } else {
    items.push({ ...item, qty: item.qty || "1" });
  }
  saveQuoteCart(items);
  return items;
}

export function removeFromQuoteCart(index: number) {
  const items = loadQuoteCart();
  items.splice(index, 1);
  saveQuoteCart(items);
  return items;
}

export function clearQuoteCart() {
  saveQuoteCart([]);
}

export function updateCartQty(index: number, qty: string) {
  const items = loadQuoteCart();
  if (items[index]) {
    items[index].qty = qty;
    saveQuoteCart(items);
  }
  return items;
}

export function setCartItemQty(productId: string, qty: string) {
  const items = loadQuoteCart();
  const idx = items.findIndex((x) => x.productId === productId);
  if (idx >= 0) {
    items[idx].qty = qty;
    saveQuoteCart(items);
  }
  return items;
}
