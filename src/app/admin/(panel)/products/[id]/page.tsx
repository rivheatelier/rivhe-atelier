import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteProduct, ProductForm } from "@/components/admin/product-form";
import { BackLink, Banner, PageTitle, ProductBadge } from "@/components/admin/ui";
import { IconExternal } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { getUsdRate } from "@/lib/exchange-rate";
import { adminGetProduct, adminListProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Edit piece" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const [product, all, { rate: usdRate }] = await Promise.all([adminGetProduct(id), adminListProducts(), getUsdRate()]);
  if (!product) notFound();
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))];

  const heldBy = product.heldByOrderId ? await getOrderById(product.heldByOrderId) : null;

  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageTitle
        title={product.name}
        action={
          product.status !== "draft" ? (
            <Link href={`/products/${product.slug}`} target="_blank" className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink">
              View <IconExternal className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <ProductBadge status={product.status} />
        {heldBy && (
          <span>
            {product.status === "sold" ? "Sold in" : "Held by"}{" "}
            <Link href={`/admin/orders/${heldBy.code}`} className="text-ink underline underline-offset-4">
              #{heldBy.code}
            </Link>
          </span>
        )}
      </div>
      {saved && <Banner>Saved. Changes are live on the store.</Banner>}
      <ProductForm product={product} categories={categories} usdRate={usdRate} />
      <div className="mt-10 border-t border-line pt-6">
        <DeleteProduct productId={product.id} disabled={product.status === "reserved"} />
      </div>
    </>
  );
}
