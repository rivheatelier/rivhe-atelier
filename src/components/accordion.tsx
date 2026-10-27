import { IconMinus, IconPlus } from "@/components/icons";

/** Native <details>, so it works without JavaScript and is keyboard accessible. */
export function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
        <span className="eyebrow">{title}</span>
        <IconPlus className="h-4 w-4 text-ink-2 group-open:hidden" />
        <IconMinus className="hidden h-4 w-4 text-ink-2 group-open:block" />
      </summary>
      <div className="pb-5 text-[14px] leading-[1.8] text-ink-2">{children}</div>
    </details>
  );
}
