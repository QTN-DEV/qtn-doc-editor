import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert file path to Python-style dot notation
 * Example: "src/controllers/scan_controller.py" -> "src.controllers.scan_controller"
 */
export function toDotNotation(filePath: string): string {
  return filePath
    .replace(/\\/g, "/") // Normalize Windows paths to forward slashes
    .replace(/\.py$/, "") // Remove .py extension
    .replace(/\/__init__$/, "") // Remove __init__ file references
    .replace(/\//g, "."); // Convert slashes to dots
}
