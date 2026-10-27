import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resetPageAction, savePageAction } from "@/app/admin/actions";
import { ActionForm, Field } from "@/components/admin/action-form";
import { BackLink, Banner, Card, PageTitle } from "@/components/admin/ui";
import { IconExternal } from "@/components/icons";
import { getPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Edit page" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ reset?: string }> };

export default async function EditPagePage({ params, searchParams }: Props) {
  const [{ slug }, { reset }] = await Promise.all([params, searchParams]);
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <>
      <BackLink href="/admin/pages">Pages</BackLink>
      <PageTitle
        title={page.title}
        action={
          <Link href={`/${page.slug}`} target="_blank" className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink">
            View <IconExternal className="h-4 w-4" />
          </Link>
        }
      />
      {reset && <Banner tone="info">Restored the starter text.</Banner>}

      <Card>
        <ActionForm action={savePageAction} submitLabel="Save page">
          <input type="hidden" name="slug" value={page.slug} />
          <div className="space-y-4">
            <Field label="Title" htmlFor="page-title">
              <input id="page-title" name="title" defaultValue={page.title} required className="field" />
            </Field>
            <Field
              label="Text"
              htmlFor="page-body"
              hint={
                <>
                  Leave an empty line between paragraphs. <code>## Heading</code> for a heading, <code>- item</code> for a bullet,{" "}
                  <code>**bold**</code>, and <code>[link text](/contact)</code> for a link.
                </>
              }
            >
              <textarea id="page-body" name="body" rows={20} defaultValue={page.body} className="field text-[14px] leading-relaxed" />
            </Field>
          </div>
        </ActionForm>
      </Card>

      {page.updatedAt && (
        <form action={resetPageAction.bind(null, page.slug)} className="mt-6">
          <button type="submit" className="text-[12px] text-ink-2 underline underline-offset-4 hover:text-ink">
            Restore the starter text
          </button>
        </form>
      )}
    </>
  );
}
