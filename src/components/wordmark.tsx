import { cn } from "@/lib/utils";

/** RIVHÉ with ATELIER set small underneath, as in the brand header. */
export function Wordmark({ size = "md", align = "center", className }: {
  size?: "sm" | "md" | "lg";
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none text-ink", align === "center" ? "items-center" : "items-start", className)}>
      <span
        className={cn(
          "font-serif font-medium tracking-[0.06em]",
          size === "sm" && "text-[21px]",
          size === "md" && "text-[27px] sm:text-[30px]",
          size === "lg" && "text-[38px]",
        )}
      >
        RIVHÉ
      </span>
      <span
        className={cn(
          "font-sans tracking-[0.5em]",
          align === "center" && "pl-[0.5em]",
          size === "sm" && "mt-[3px] text-[6.5px]",
          size === "md" && "mt-[4px] text-[7.5px] sm:text-[8px]",
          size === "lg" && "mt-[6px] text-[9.5px]",
        )}
      >
        ATELIER
      </span>
    </span>
  );
}
