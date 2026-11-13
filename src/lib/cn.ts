/** Joins class names, skipping the empty ones. */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** The focus ring every control shares. */
export const FOCUS = "outline-none focus-visible:shadow-[0_0_0_2px_rgb(174_187_255/0.6)]";
