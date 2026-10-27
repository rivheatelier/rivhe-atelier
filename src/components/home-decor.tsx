import { cn } from "@/lib/utils";

/**
 * Behind the homepage: soft washes in the bags' own colours (lavender, peach,
 * sage, butter) over a faint knit texture. Radial gradients rather than blur
 * filters, so it stays light on phones.
 */
export function HomeBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="stitch-texture absolute inset-0 [mask-image:linear-gradient(to_bottom,black,black_60%,transparent)]" />
      <Wash color="var(--wash-lavender)" className="top-[-4%] left-[-35%] w-[110vw] max-w-[860px] sm:left-[-14%]" />
      <Wash color="var(--wash-peach)" className="top-[20%] right-[-40%] w-[100vw] max-w-[780px] sm:right-[-14%]" />
      <Wash color="var(--wash-sage)" className="top-[46%] left-[-40%] w-[100vw] max-w-[780px] sm:left-[-12%]" />
      <Wash color="var(--wash-butter)" className="top-[70%] right-[-35%] w-[90vw] max-w-[660px] sm:right-[-6%]" />
    </div>
  );
}

function Wash({ color, className }: { color: string; className: string }) {
  return (
    <div
      className={cn("absolute aspect-square rounded-full", className)}
      style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }}
    />
  );
}

/** A loose strand of yarn with a single loop, used between homepage sections. */
export function YarnDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 48"
      fill="none"
      className={cn("mx-auto block h-12 w-full max-w-xl", className)}
      style={{ color: "var(--yarn)" }}
    >
      <path
        d="M0 30C60 12 120 44 190 28S300 10 330 26C352 38 378 34 380 20C382 6 360 4 352 16C344 28 362 44 392 38C440 28 520 40 600 22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
