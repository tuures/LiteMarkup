import * as Ast from './ast'

//
// HTML renderer
//
export interface HtmlRendererOptions {
  allowUnsafeHtml?: boolean
  indentCharacters?: string
}

export function htmlRenderer({
  allowUnsafeHtml = false,
  indentCharacters = '  ',
}: HtmlRendererOptions = {}): (ast: Ast.Block[]) => string {
  const repeat = (s: string) => (times: number) => s.repeat(times)
  const indent = repeat(indentCharacters)

  function renderBlock(blocks: Ast.Block[], indentLevel = 0): string {
    const i = indent(indentLevel)

    const lines = blocks.map(n => {
      switch (n.type) {
        case 'bq':
          return el('blockquote', `\n${renderBlock(n.doc, indentLevel + 1)}\n${i}`)
        case 'l': {
          const containerTag = n.startNumber ? 'ol' : 'ul'
          const attributes: [string, string][] = n.startNumber
            ? [['start', String(n.startNumber)]]
            : []

          return el(
            containerTag,
            `\n${renderListItems(n.items, indentLevel + 1)}\n${i}`,
            attributes,
          )
        }
        case 'hr':
          return '<hr/>'
        case 'h':
          return el(`h${n.level}`, renderInline(n.body))
        case 'htm':
          return allowUnsafeHtml ? n.raw : el('p', esc(n.raw))
        case 'cb':
          return el(
            'pre',
            el('code', esc(n.txt), n.infoText ? [['data-infotext', n.infoText]] : []),
          )
        case 'p':
          return el('p', renderInline(n.body))
        default:
          throw new Error('Unexpected AST node: ' + (n as any).type)
      }
    })

    return `${i}${lines.join(`\n${i}`)}`
  }

  function renderListItems(items: Ast.ListItem[], indentLevel: number): string {
    const i = indent(indentLevel)

    const lines = items.map(item => el('li', `\n${renderBlock(item.doc, indentLevel + 1)}\n${i}`))

    return `${i}${lines.join(`\n${i}`)}`
  }

  function renderInline(inlines: Ast.Inline[]): string {
    return inlines
      .map(n => {
        switch (n.type) {
          case '':
            return esc(n.txt)
          case 'cs':
            return el('code', esc(n.txt))
          case 'br':
            return '<br/>'
          case 'i':
            return el('i', renderInline(n.body))
          case 'b':
            return el('b', renderInline(n.body))
          case 'a':
            return allowUnsafeHtml
              ? el('a', renderInline(n.body), [['href', n.href]])
              : '[' + renderInline(n.body) + ']' + esc('<' + n.href + '>')
          case 'img':
            return allowUnsafeHtml
              ? el('img', null, [
                  ['alt', n.alt],
                  ['src', n.src],
                ])
              : esc('[' + n.alt + ']<' + n.src + '>')
          default:
            throw new Error('Unexpected AST node: ' + (n as any).type)
        }
      })
      .join('')
  }

  return (ast: Ast.Block[]) => {
    if (!Array.isArray(ast)) {
      throw new Error('Expected array of AST nodes')
    }

    return renderBlock(ast)
  }
}

const esc = (txt: string) =>
  txt
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function el(tagName: string, body: string | null, attr: Array<[string, string]> = []) {
  const attributes = attr.map(a => `${a[0]}="${esc(a[1])}"`).join(' ')

  const start = `<${tagName}${attributes.length ? ' ' : ''}${attributes}`
  const end = body !== null ? `>${body}</${tagName}>` : '/>'
  return start + end
}
