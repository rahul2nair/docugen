import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function MetallicButton({
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        "metal-button inline-flex items-center justify-center rounded-2xl border border-[rgba(108,73,40,0.28)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:scale-[0.99]",
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl border border-[rgba(120,90,58,0.18)] bg-[rgba(255,255,255,0.88)] px-5 py-3 text-sm font-semibold text-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:border-[rgba(120,90,58,0.26)] hover:bg-white",
        className
      )}
      {...props}
    />
  );
}
