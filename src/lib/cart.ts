import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getProductsByIds, type Product } from "@/lib/products";

export const CART_COOKIE = "rivhe_cart";
const MAX_ITEMS = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every piece is one of a kind, so the cart is just a list of product ids (quantity is always 1).
export async function getCartIds(): Promise<string[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value ?? "";
  return [...new Set(raw.split(",").filter((id) => UUID.test(id)))].slice(0, MAX_ITEMS);
}

export async function setCartIds(ids: string[]): Promise<void> {
  const jar = await cookies();
  if (ids.length === 0) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, ids.slice(0, MAX_ITEMS).join(","), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export type CartItem = { product: Product; available: boolean };

export type Cart = {
  items: CartItem[];
  /** Pieces that can still be bought; only these count toward the subtotal. */
  purchasable: Product[];
  subtotalUsd: number;
  weightGrams: number;
};

export const getCart = cache(async (): Promise<Cart> => {
  const ids = await getCartIds();
  const products = await getProductsByIds(ids);
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((p): p is Product => !!p && p.status !== "draft")
    .map((product) => ({ product, available: product.status === "available" }));
  const purchasable = items.filter((i) => i.available).map((i) => i.product);
  return {
    items,
    purchasable,
    subtotalUsd: purchasable.reduce((sum, p) => sum + p.priceUsd, 0),
    weightGrams: purchasable.reduce((sum, p) => sum + p.weightGrams, 0),
  };
});
