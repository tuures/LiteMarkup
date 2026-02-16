import * as Ast from './ast'
import { parser, type ParserOptions } from './parser'
import { renderHtml } from './html'

//
// Facade
//

export * from './ast'
export * from './parser'
export * from './html'

const textifyHtmlBlocks = (n: Ast.Block): Ast.Block[] =>
  n.name === 'htm' ? [{ name: 'p', body: [{ name: '', txt: n.raw }] }] : [n]

const textifyImages = (n: Ast.Inline): Ast.Inline[] =>
  n.name === 'img' ? [{ name: '', txt: '[' + n.alt + '](' + n.src + ')' }] : [n]

const textifyLinks = (n: Ast.Inline): Ast.Inline[] =>
  n.name === 'a' ? [...n.body, { name: '', txt: ' (' + n.href + ')' }] : [n]

export function convertToHtml(
  src: string,
  { allowUnsafeHtml }: { allowUnsafeHtml?: boolean } = {},
) {
  const options: ParserOptions = allowUnsafeHtml
    ? {}
    : {
        transformBlock: textifyHtmlBlocks,
        transformInline: n => textifyImages(n).flatMap(textifyLinks),
      }

  return renderHtml(parser(options)(src))
}
