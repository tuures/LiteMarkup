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
  const indent = (text: string) => text.replace(/(^|\n)/g, '$1' + indentCharacters)

  const elementMultiline = (
    tag: string,
    children: string,
    attributes?: [string, string][],
  ): string => {
    return element(tag, children.length > 0 ? '\n' + indent(children) + '\n' : '', attributes)
  }

  function renderBlock(blocks: Ast.Block[]): string {
    return blocks
      .map(n => {
        switch (n.type) {
          case 'bq':
            return elementMultiline('blockquote', renderBlock(n.doc))
          case 'l': {
            const tag = n.startNumber ? 'ol' : 'ul'
            const attr: [string, string][] = n.startNumber ? [['start', String(n.startNumber)]] : []
            const items = n.items
              .map(item => elementMultiline('li', renderBlock(item.doc)))
              .join('\n')

            return elementMultiline(tag, items, attr)
          }
          case 'hr':
            return '<hr/>'
          case 'h':
            return element(`h${n.level}`, renderInline(n.body))
          case 'htm':
            return allowUnsafeHtml ? n.raw : element('p', escape(n.raw))
          case 'cb':
            return element(
              'pre',
              element('code', escape(n.txt), n.infoText ? [['data-infotext', n.infoText]] : []),
            )
          case 'tbl': {
            const thead = elementMultiline('thead', renderTableRows('th', n.rows.slice(0, 1)))
            const tbody = elementMultiline('tbody', renderTableRows('td', n.rows.slice(1)))

            return elementMultiline('table', [thead, tbody].join('\n'))
          }
          case 'p':
            return element('p', renderInline(n.body))
          case 'x':
            return ''
          default:
            return unknownNode(n)
        }
      })
      .join('\n')
  }

  function renderTableRows(cellTag: 'th' | 'td', rows: Ast.Inline[][][]): string {
    return rows
      .map(row => {
        const cells = row.map(cell => element(cellTag, renderInline(cell))).join('\n')
        return elementMultiline('tr', cells)
      })
      .join('\n')
  }

  function renderInline(inlines: Ast.Inline[]): string {
    return inlines
      .map(n => {
        switch (n.type) {
          case '':
            return escape(n.txt)
          case 'cs':
            return element('code', escape(n.txt))
          case 'br':
            return '<br/>'
          case 'i':
            return element('i', renderInline(n.body))
          case 'b':
            return element('b', renderInline(n.body))
          case 'a':
            return allowUnsafeHtml
              ? element('a', renderInline(n.body), [['href', n.href]])
              : '[' + renderInline(n.body) + ']' + escape('<' + n.href + '>')
          case 'img':
            return allowUnsafeHtml
              ? element('img', null, [
                  ['alt', n.alt],
                  ['src', n.src],
                ])
              : escape('[' + n.alt + ']<' + n.src + '>')
          case 'x':
            return ''
          default:
            return unknownNode(n)
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

const escape = (txt: string) =>
  txt
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const element = (
  tagName: string,
  body: string | null,
  attributes: Array<[string, string]> = [],
) => {
  const attr = attributes.map(a => `${a[0]}="${escape(a[1])}"`).join(' ')

  const start = `<${tagName}${attr.length ? ' ' : ''}${attr}`
  const end = body !== null ? `>${body}</${tagName}>` : '/>'

  return start + end
}

const unknownNode = (n: never): never => {
  throw new Error('Unexpected AST node: ' + (n as any).type)
}
