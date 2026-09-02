/**
 * The Sansekai mark, drawn rather than loaded.
 *
 * The logo file is a cream JPEG with a gold mark — it carries its own
 * background, so on any surface that is not cream it lands as a pale square.
 * The mark itself is three plain bars, so the back office draws them instead
 * and inherits `currentColor`: ink on the canvas here, and whatever the rail
 * uses once the dashboard follows.
 *
 * Proportions are taken from the artwork, including the bars' uneven widths —
 * the middle one is the short one, and evening them up would be a different
 * mark.
 */
export function SansekaiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 86.5"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="2.9" y="0" width="94.1" height="12.6" />
      <rect x="16.4" y="32.8" width="67.2" height="12.6" />
      <rect x="0" y="73.9" width="100" height="12.6" />
    </svg>
  );
}
