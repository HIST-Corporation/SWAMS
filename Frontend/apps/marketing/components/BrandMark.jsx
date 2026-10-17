/**
 * SWAMS brand mark — the sanctioned placeholder glyph from the app icon
 * (apps/web/public/icons/icon.svg, Open Decision 11), inlined as JSX so the
 * static marketing export needs no /public asset and never 404s. The final
 * illustration set will replace this one component.
 *
 * Decorative by default (`aria-hidden`): it always appears beside the
 * "SWAMS." wordmark, which carries the accessible name.
 */
export function BrandMark({ size = 32, className }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="512" height="512" rx="96" fill="#3F5BE0" />
      <g fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round">
        <path d="M256 172c-30 0-58 12-78 32" />
        <path d="M334 204c-18-18-42-30-78-30" />
        <path d="M198 244a58 58 0 0 1 116 0v28" />
        <path d="M162 268a94 94 0 0 1 188 0v22" />
        <path d="M256 300v52" />
        <path d="M220 344c8 14 22 24 36 24" />
        <path d="M316 348v-26" />
        <path d="M196 330v-18" />
      </g>
      <circle cx="360" cy="330" r="18" fill="#F2A93B" />
    </svg>
  );
}
