import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { BackLink, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getUsdRate } from "@/lib/exchange-rate";
import { adminListProducts } from "@/lib/products";

export const metadata: Metadata = { title: "New piece" };

export default async function NewProductPage() {
  await requireAdmin();
  const [products, { rate: usdRate }] = await Promise.all([adminListProducts(), getUsdRate()]);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageTitle title="New piece" />
      <ProductForm categories={categories} usdRate={usdRate} />
    </>
  );
}
