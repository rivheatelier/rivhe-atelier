import type { Metadata } from "next";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md px-5 pt-12 sm:pt-16">
      <h1 className="text-center font-serif text-[34px] leading-tight">Track your order</h1>
      <p className="mt-3 text-center text-[14px] leading-relaxed text-ink-2">
        No account needed. Enter your order number (for example RIVHE1001) and the email you used at checkout.
      </p>
      <TrackForm />
    </div>
  );
}
