import { twMerge } from "tailwind-merge";

type ClassValue = string | null | undefined | false;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(inputs.filter(Boolean).join(" "));
}
