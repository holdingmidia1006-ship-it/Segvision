import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "default" | "small";

function buttonClassName({
  className,
  fullWidth,
  size = "default",
  variant = "primary",
}: {
  className?: string;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(
    "button",
    `button-${variant}`,
    size === "small" && "button-small",
    fullWidth && "button-full",
    className,
  );
}

export function Button({
  children,
  className,
  fullWidth,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={buttonClassName({ className, fullWidth, size, variant })}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  fullWidth,
  href,
  size,
  variant,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
  fullWidth?: boolean;
  href: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <Link
      className={buttonClassName({ className, fullWidth, size, variant })}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
