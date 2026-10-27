import Image from "next/image";

/** A close crop of the stitches beside the brand line, as in the product page design. */
export function MadeByHand({ image }: { image?: string }) {
  if (!image) return null;
  return (
    <section className="mx-auto mt-16 max-w-7xl sm:px-8 lg:mt-24">
      <div className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] overflow-hidden bg-cream sm:aspect-auto sm:min-h-[340px]">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 640px) 66vw, 100vw"
            quality={85}
            className="origin-[50%_62%] scale-[1.9] object-cover object-[50%_62%]"
          />
        </div>
        <div className="flex flex-col items-center justify-center bg-sand/70 px-8 py-12 text-center">
          <p className="font-serif text-[30px] leading-snug text-ink italic">
            Made by hand,
            <br />
            made to be loved.
          </p>
          <span className="mt-5 block h-px w-12 bg-ink/40" />
        </div>
      </div>
    </section>
  );
}
