import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function MetallicButton({
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        "metal-button inline-flex items-center justify-center rounded-2xl border border-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:scale-[0.99]",
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
        "inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50",
        className
      )}
      {...props}
    />
  );
}
