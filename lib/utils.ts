import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** e.g. "2 minutes ago" — used in gallery and history rows. */
export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 90) return "a minute ago";

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return formatter.format(-days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return formatter.format(-months, "month");
  return formatter.format(-Math.floor(months / 12), "year");
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

/** Truncates on a word boundary so prompt previews don't cut mid-word. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength)}…`;
}
