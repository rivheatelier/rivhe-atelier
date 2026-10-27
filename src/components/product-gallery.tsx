"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { IconChevronLeft, IconChevronRight, IconClose, IconMinus, IconPlus, IconZoom } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Swipeable photos with thumbnails. On desktop the photo magnifies under the
 * cursor; tapping or clicking opens a full-screen viewer with pinch, double-tap
 * and scroll zoom.
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  if (images.length === 0) return <div className="aspect-[4/5] bg-cream" />;

  const scrollTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  };

  return (
    <div className="lg:grid lg:grid-cols-[76px_minmax(0,1fr)] lg:items-start lg:gap-4">
      <div className="relative lg:order-2">
        <div
          ref={scroller}
          onScroll={(event) => {
            const el = event.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => {
                setActive(i);
                setOpen(true);
              }}
              className="relative aspect-[4/5] w-full shrink-0 cursor-zoom-in snap-center overflow-hidden bg-cream"
              aria-label={`Zoom photo ${i + 1} of ${name}`}
            >
              <HoverZoom src={src} alt={i === 0 ? name : `${name}, photo ${i + 1}`} preload={i === 0} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full bg-paper/90 text-ink shadow-sm backdrop-blur-sm"
          aria-label="Zoom photo"
        >
          <IconZoom className="h-5 w-5" />
        </button>
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 sm:px-8 lg:order-1 lg:mt-0 lg:flex-col lg:px-0">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-cream transition-opacity lg:w-full",
                i === active ? "opacity-100 ring-1 ring-ink ring-offset-2 ring-offset-paper" : "opacity-60 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={active}
        slides={images.map((src) => ({ src, alt: name }))}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
        carousel={{ finite: images.length < 2 }}
        controller={{ closeOnBackdropClick: true }}
        on={{ view: ({ index }) => setActive(index) }}
        render={{
          iconClose: () => <IconClose className="yarl__icon" strokeWidth={1.2} />,
          iconPrev: () => <IconChevronLeft className="yarl__icon" strokeWidth={1.2} />,
          iconNext: () => <IconChevronRight className="yarl__icon" strokeWidth={1.2} />,
          iconZoomIn: () => <IconPlus className="yarl__icon" strokeWidth={1.2} />,
          iconZoomOut: () => <IconMinus className="yarl__icon" strokeWidth={1.2} />,
          ...(images.length < 2 ? { buttonPrev: () => null, buttonNext: () => null } : {}),
        }}
      />
    </div>
  );
}

function HoverZoom({ src, alt, preload }: { src: string; alt: string; preload: boolean }) {
  const layer = useRef<HTMLDivElement>(null);

  return (
    <div
      className="group/zoom absolute inset-0"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        if (layer.current) layer.current.style.transformOrigin = `${x}% ${y}%`;
      }}
    >
      <div ref={layer} className="absolute inset-0 transition-transform duration-300 ease-out group-hover/zoom:scale-200">
        <Image
          src={src}
          alt={alt}
          fill
          preload={preload}
          quality={85}
          sizes="(min-width: 1024px) 900px, 100vw"
          className="object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
}
