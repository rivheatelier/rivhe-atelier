import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-5 text-center">
      <Link href="/" aria-label="RIVHÉ Atelier — home">
        <Wordmark />
      </Link>
      <h1 className="mt-14 font-serif text-[34px] leading-tight">This page has unravelled</h1>
      <p className="mt-3 max-w-sm text-[14px] text-ink-2">The link may be old, or the piece may have found its home.</p>
      <Link href="/shop" className="btn-primary mt-8 px-10">
        Shop all pieces
      </Link>
    </div>
  );
}
