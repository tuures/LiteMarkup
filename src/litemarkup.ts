import { parser } from './parser'
import { htmlRenderer } from './html'

//
// Facade
//

export * from './ast'
export * from './parser'
export * from './html'

/**
 * Convenience function that parses a markup string and renders it directly to HTML.
 *
 * By default, raw HTML blocks, links, and images are textified for security.
 * Pass `allowUnsafeHtml: true` to render them (only for trusted input).
 *
 * @param src - The markup source string to convert.
 * @param options - Optional settings for parsing and rendering.
 * @returns The rendered HTML string.
 */
export function convertToHtml(
  src: string,
  { allowUnsafeHtml, markdownMode }: { allowUnsafeHtml?: boolean; markdownMode?: boolean } = {},
): string {
  return htmlRenderer({ allowUnsafeHtml })(parser({ markdownMode })(src))
}
