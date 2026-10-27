"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;

export function HeroSlider({ images, tagline, subtitle }: { images: string[]; tagline: string; subtitle: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const count = images.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, count, paused]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  // The tagline is set over two lines: "Every stitch / tells a different story".
  const words = tagline.split(" ");
  const breakAt = Math.min(2, Math.max(1, words.length - 1));

  return (
    <section
      className="lg:grid lg:min-h-[calc(100svh-76px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative aspect-[4/5] touch-pan-y overflow-hidden bg-cream sm:aspect-[5/4] lg:order-2 lg:aspect-auto"
        onPointerDown={(event) => (pointerStart.current = event.clientX)}
        onPointerUp={(event) => {
          if (pointerStart.current === null || count < 2) return;
          const delta = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
        }}
      >
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            preload={i === 0}
            sizes="(min-width: 1024px) 58vw, 100vw"
            quality={85}
            className={cn(
              "object-cover transition-opacity duration-[1400ms] ease-out select-none",
              i === index ? "opacity-100" : "opacity-0",
            )}
            draggable={false}
          />
        ))}
      </div>

      <div className="px-6 pt-10 pb-12 sm:px-10 lg:order-1 lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-16">
        <h1 className="sr-only">RIVHÉ Atelier — handmade crochet goods</h1>
        <p className="font-script text-[46px] leading-[1.02] text-ink sm:text-[58px] xl:text-[68px]">
          {words.slice(0, breakAt).join(" ")}
          <br />
          {words.slice(breakAt).join(" ")}
        </p>
        <p className="eyebrow mt-6 max-w-[19rem] leading-[2] text-ink-2">{subtitle}</p>
        <Link
          href="/shop"
          className="eyebrow mt-8 inline-flex items-center gap-3 self-start border-b border-ink pb-1.5 text-ink"
        >
          Shop now <IconArrowRight className="h-4 w-4" />
        </Link>

        {count > 1 && (
          <div className="mt-12 flex gap-5 text-[11px] tracking-[0.14em]" role="tablist" aria-label="Slides">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show slide ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  "border-b pb-1 transition-colors",
                  i === index ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink-2",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
