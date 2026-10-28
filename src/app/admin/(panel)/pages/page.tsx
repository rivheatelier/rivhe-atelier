import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { IconChevronRight } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { EDITABLE_PAGES, getPage } from "@/lib/pages";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await requireAdmin();
  const pages = await Promise.all(EDITABLE_PAGES.map((slug) => getPage(slug)));

  return (
    <>
      <PageTitle title="Pages" subtitle="The text of your information pages. Product and homepage text live in Settings." />
      <ul className="space-y-2">
        {pages.map(
          (page) =>
            page && (
              <li key={page.slug}>
                <Link
                  href={`/admin/pages/${page.slug}`}
                  className="flex items-center gap-3 rounded-[4px] border border-line bg-surface p-4 transition-colors hover:border-ink/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink">{page.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      rivhe.com/{page.slug} · {page.updatedAt ? `edited ${formatDate(page.updatedAt)}` : "starter text"}
                    </p>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </li>
            ),
        )}
      </ul>
    </>
  );
}
