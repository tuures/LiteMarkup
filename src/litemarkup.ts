import { parser } from './parser'
import { htmlRenderer } from './html'

//
// Facade
//

export * from './ast'
export * from './parser'
export * from './html'

export function convertToHtml(
  src: string,
  { allowUnsafeHtml, markdownMode }: { allowUnsafeHtml?: boolean; markdownMode?: boolean } = {},
): string {
  return htmlRenderer({ allowUnsafeHtml })(parser({ markdownMode })(src))
}
