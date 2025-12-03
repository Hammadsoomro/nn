import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date and time in 12-hour AM/PM format
 * Example: "1/12/2025, 5:10:55 PM"
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format time only in 12-hour AM/PM format
 * Example: "5:10:55 PM"
 */
export function formatTime(timeString: string): string {
  try {
    const date = new Date(timeString);
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  } catch {
    return timeString;
  }
}

/**
 * Format date only in 12-hour AM/PM format
 * Example: "1/12/2025"
 */
export function formatDateOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  } catch {
    return dateString;
  }
}
