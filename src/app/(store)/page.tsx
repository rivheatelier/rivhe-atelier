import Image from "next/image";
import Link from "next/link";
import { HeroSlider } from "@/components/hero-slider";
import { HomeBackdrop, YarnDivider } from "@/components/home-decor";
import { IconArrowRight, IconGlobe, IconSparkle, IconYarn } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { getCurrency } from "@/lib/currency-server";
import { listStoreProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

const PROMISES = [
  { icon: IconYarn, title: "Handmade", text: "Crocheted stitch by stitch, never mass-produced." },
  { icon: IconSparkle, title: "One of a kind", text: "Only one piece per colour and model." },
  { icon: IconGlobe, title: "Ships worldwide", text: "With DHL Express or Aramex, from Indonesia." },
];

export default async function HomePage() {
  const [settings, currency, products] = await Promise.all([
    getSettings(),
    getCurrency(),
    listStoreProducts({ newest: true, limit: 8 }),
  ]);
  const textureImage = products[0]?.images[0];

  return (
    <div className="relative isolate pb-4">
      <HomeBackdrop />

      <HeroSlider images={settings.heroImages} tagline={settings.tagline} subtitle={settings.heroSubtitle} />

      <YarnDivider className="mt-6 px-6 lg:mt-10" />

      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:pt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="eyebrow">New arrivals</h2>
            <p className="mt-1 font-script text-[28px] leading-none text-ink-2">fresh off the hook</p>
          </div>
          <Link href="/shop" className="eyebrow inline-flex items-center gap-2 text-ink-2 transition-colors hover:text-ink">
            View all <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} currency={currency} preload={i < 2} />
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-line py-16 text-center text-[14px] text-muted">New pieces are on the hook. Check back soon.</p>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-5 sm:px-8 lg:mt-28">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {textureImage && (
            <div className="relative mr-3 mb-3">
              {/* Offset outline in the yarn colour, like a frame sketched around the stitches. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-3 rounded-[3px] border"
                style={{ borderColor: "var(--yarn)" }}
              />
              <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-cream">
                <Image
                  src={textureImage}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  quality={85}
                  className="origin-[50%_62%] scale-[1.7] object-cover object-[50%_62%]"
                />
              </div>
            </div>
          )}
          <div className="md:max-w-md">
            <p className="font-serif text-[34px] leading-[1.15] text-ink italic sm:text-[40px]">
              Made by hand,
              <br />
              made to be loved.
            </p>
            <p className="mt-5 text-[15px] leading-[1.85] text-ink-2">
              Each piece is crocheted slowly, row by row, in a palette of its own. We make only one of every colour and model — once
              it’s gone, it’s gone.
            </p>
            <Link href="/about" className="eyebrow mt-7 inline-flex items-center gap-3 border-b border-ink pb-1.5">
              Our story <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <YarnDivider className="mt-16 rotate-180 px-6 lg:mt-24" />

      <section className="mx-auto mt-8 max-w-7xl px-5 sm:px-8 lg:mt-10">
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-paper/75 px-6 py-8 text-center backdrop-blur-sm">
              <Icon className="mx-auto h-7 w-7 text-ink-2" strokeWidth={1.2} />
              <p className="eyebrow mt-4 text-ink">{title}</p>
              <p className="mx-auto mt-2 max-w-[16rem] text-[13px] leading-relaxed text-ink-2">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
