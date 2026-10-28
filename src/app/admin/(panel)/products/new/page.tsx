import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { BackLink, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getUsdRate } from "@/lib/exchange-rate";

export const metadata: Metadata = { title: "New piece" };

export default async function NewProductPage() {
  await requireAdmin();
  const { rate: usdRate } = await getUsdRate();

  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageTitle title="New piece" />
      <ProductForm usdRate={usdRate} />
    </>
  );
}
