import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  decorative?: boolean;
  priority?: boolean;
  variant?: "symbol" | "horizontal";
};

export function BrandLogo({
  className,
  decorative = false,
  priority = false,
  variant = "horizontal",
}: BrandLogoProps) {
  const symbol = variant === "symbol";

  return (
    <span
      className={cn(
        "brand-logo",
        symbol ? "brand-logo-symbol" : "brand-logo-horizontal",
        className,
      )}
    >
      <Image
        alt={
          decorative
            ? ""
            : symbol
              ? "Símbolo da SEG VISIOM"
              : "SEG VISIOM"
        }
        aria-hidden={decorative}
        src={
          symbol
            ? "/segvisiom/logo-simbolo-transparente.png"
            : "/segvisiom/logo-horizontal-transparente.png"
        }
        width={symbol ? 1254 : 1774}
        height={symbol ? 1254 : 887}
        priority={priority}
        sizes={symbol ? "48px" : "(max-width: 650px) 220px, 300px"}
      />
    </span>
  );
}
