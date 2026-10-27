import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getPage } from "@/lib/pages";

// About, Shipping & Returns, Care Guide and Terms — editable in /admin/pages.
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await getPage((await params).slug);
  return page ? { title: page.title } : {};
}

export default async function ContentPage({ params }: { params: Params }) {
  const page = await getPage((await params).slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-2xl px-5 pt-12 sm:px-8 sm:pt-16">
      <h1 className="text-center font-serif text-[38px] leading-tight sm:text-[44px]">{page.title}</h1>
      <span className="mx-auto mt-6 mb-10 block h-px w-12 bg-ink/30" aria-hidden="true" />
      <div className="prose-rivhe" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
    </article>
  );
}
