"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

type Mask = "document" | "phone" | "postal-code";

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function formatDocument(value: string) {
  const raw = digits(value, 14);
  if (raw.length <= 11) {
    return raw
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return raw
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const raw = digits(value, 11);
  if (!raw) return "";
  if (raw.length <= 10) {
    return raw
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return raw
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatPostalCode(value: string) {
  return digits(value, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function applyMask(value: string, mask: Mask) {
  if (mask === "document") return formatDocument(value);
  if (mask === "phone") return formatPhone(value);
  return formatPostalCode(value);
}

export function MaskedInput({
  defaultValue,
  mask,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue"> & {
  defaultValue?: string | number | readonly string[];
  mask: Mask;
}) {
  const [value, setValue] = useState(() =>
    applyMask(String(defaultValue ?? ""), mask),
  );

  return (
    <input
      {...props}
      value={value}
      inputMode="numeric"
      onChange={(event) => setValue(applyMask(event.target.value, mask))}
    />
  );
}
