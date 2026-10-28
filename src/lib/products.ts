import "server-only";
import { cache } from "react";
import { db } from "@/lib/supabase/admin";

export type ProductStatus = "draft" | "available" | "reserved" | "sold";

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** The price, in US dollars. Rupiah is derived from the live rate (see idrFromUsd). */
  priceUsd: number;
  description: string;
  /** Shown under the description: what inspired the piece, the yarn, how it was made. */
  story: string;
  details: string[];
  detailsText: string;
  category: string;
  weightGrams: number;
  images: string[];
  status: ProductStatus;
  heldByOrderId: string | null;
  sortOrder: number;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_usd: number | string;
  description: string;
  story: string;
  details: string;
  category: string;
  weight_grams: number;
  images: string[] | null;
  status: ProductStatus;
  held_by_order_id: string | null;
  sort_order: number;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceUsd: Number(row.price_usd),
    description: row.description,
    story: row.story,
    details: row.details
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    detailsText: row.details,
    category: row.category,
    weightGrams: row.weight_grams,
    images: row.images ?? [],
    status: row.status,
    heldByOrderId: row.held_by_order_id,
    sortOrder: row.sort_order,
    soldAt: row.sold_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rows(data: unknown): Product[] {
  return ((data as ProductRow[] | null) ?? []).map(toProduct);
}

/** Unpaid orders past their deadline release their pieces back to the shop. */
export async function releaseExpiredOrders(): Promise<void> {
  const { error } = await db().rpc("release_expired_orders");
  if (error) console.error("[orders] release_expired_orders failed:", error.message);
}

// --- Storefront ------------------------------------------------------------

type ListOptions = { category?: string; q?: string; availableOnly?: boolean; newest?: boolean; limit?: number };

/** Published pieces: available first, then reserved, then sold ('available' < 'reserved' < 'sold'). */
export async function listStoreProducts(options: ListOptions = {}): Promise<Product[]> {
  let query = db().from("products").select("*").neq("status", "draft").order("status", { ascending: true });
  query = options.newest
    ? query.order("created_at", { ascending: false }).order("sort_order", { ascending: true })
    : query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (options.availableOnly) query = query.eq("status", "available");
  if (options.category) query = query.eq("category", options.category);
  if (options.q) {
    const term = options.q.replace(/[%_*\\,()]/g, " ").trim();
    if (term) query = query.ilike("name", `%${term}%`);
  }
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return rows(data);
}

// Cached per request: the product page and its metadata both ask for it.
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { data, error } = await db().from("products").select("*").eq("slug", slug).neq("status", "draft").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProduct(data as ProductRow) : null;
});

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db().from("products").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  return rows(data);
}

export async function listRelated(product: Product, limit = 4): Promise<Product[]> {
  const { data, error } = await db()
    .from("products")
    .select("*")
    .eq("status", "available")
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  const list = rows(data);
  const sameCategory = list.filter((p) => p.category === product.category);
  const others = list.filter((p) => p.category !== product.category);
  return [...sameCategory, ...others].slice(0, limit);
}

// --- Admin -----------------------------------------------------------------

export async function adminListProducts(status?: ProductStatus): Promise<Product[]> {
  let query = db()
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return rows(data);
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  const { data, error } = await db().from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProduct(data as ProductRow) : null;
}

export async function adminCountProducts(): Promise<Record<ProductStatus, number>> {
  const { data, error } = await db().from("products").select("status");
  if (error) throw new Error(error.message);
  const counts: Record<ProductStatus, number> = { draft: 0, available: 0, reserved: 0, sold: 0 };
  for (const row of (data as { status: ProductStatus }[] | null) ?? []) counts[row.status] += 1;
  return counts;
}

export type ProductInput = {
  name: string;
  slug: string;
  priceUsd: number;
  description: string;
  story: string;
  details: string;
  category: string;
  weightGrams: number;
  images: string[];
  status: "draft" | "available" | "sold";
};

export async function adminSaveProduct(input: ProductInput, id?: string): Promise<Product> {
  const values = {
    name: input.name,
    slug: input.slug,
    price_usd: input.priceUsd,
    description: input.description,
    story: input.story,
    details: input.details,
    category: input.category,
    weight_grams: input.weightGrams,
    images: input.images,
  };

  if (!id) {
    const { data, error } = await db()
      .from("products")
      .insert({ ...values, status: input.status, sold_at: input.status === "sold" ? new Date().toISOString() : null })
      .select("*")
      .single();
    if (error) throw new Error(error.code === "23505" ? "SLUG_TAKEN" : error.message);
    return toProduct(data as ProductRow);
  }

  const current = await adminGetProduct(id);
  if (!current) throw new Error("NOT_FOUND");

  // A piece held by an unpaid order keeps its status; the order decides what happens to it.
  const statusChange =
    current.status === "reserved" || current.status === input.status
      ? {}
      : {
          status: input.status,
          held_by_order_id: null,
          sold_at: input.status === "sold" ? new Date().toISOString() : null,
        };

  let query = db().from("products").update({ ...values, ...statusChange }).eq("id", id);
  // Only change the status if no buyer reserved the piece since it was read above.
  if ("status" in statusChange) query = query.eq("status", current.status);
  const { data, error } = await query.select("*");
  if (error) throw new Error(error.code === "23505" ? "SLUG_TAKEN" : error.message);
  if (!data?.length) throw new Error("STATUS_CHANGED");
  return toProduct(data[0] as ProductRow);
}

export async function adminDeleteProduct(id: string): Promise<void> {
  // The status condition is part of the delete, so a checkout reserving the piece at the same moment wins.
  const { data, error } = await db().from("products").delete().eq("id", id).neq("status", "reserved").select("id");
  if (error) throw new Error(error.message);
  if (!data?.length && (await adminGetProduct(id))) throw new Error("RESERVED");
}
