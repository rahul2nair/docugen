import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
