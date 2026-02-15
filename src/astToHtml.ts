import * as Ast from './ast'

//
// HTML emitter
//

export function astToHtml(ast: Ast.Block[], indentCharacters = '  '): string {
  if (!Array.isArray(ast)) {
    throw new Error('Expected array of AST nodes')
  }

  const repeat = (s: string) => (times: number) => s.repeat(times)
  const indent = repeat(indentCharacters)

  function emitBlock(blocks: Ast.Block[], indentLevel = 0): string {
    const i = indent(indentLevel)

    const lines = blocks.map(n => {
      switch (n.name) {
        case 'bq':
          return el('blockquote', `\n${emitBlock(n.doc, indentLevel + 1)}\n${i}`)
        case 'l': {
          const containerTag = n.startNumber ? 'ol' : 'ul'
          const attributes: [string, string][] = n.startNumber
            ? [['start', String(n.startNumber)]]
            : []

          return el(containerTag, `\n${emitListItems(n.items, indentLevel + 1)}\n${i}`, attributes)
        }
        case 'hr':
          return '<hr/>'
        case 'h':
          return el(`h${n.level}`, emitInline(n.body))
        case 'htm':
          return n.raw
        case 'cb':
          return el(
            'pre',
            el('code', esc(n.txt), n.infoText ? [['data-infotext', n.infoText]] : []),
          )
        case 'p':
          return el('p', emitInline(n.body))
        default:
          throw new Error('Unexpected AST node: ' + (n as any).name)
      }
    })

    return `${i}${lines.join(`\n${i}`)}`
  }

  function emitListItems(items: Ast.ListItem[], indentLevel: number): string {
    const i = indent(indentLevel)

    const lines = items.map(item => el('li', `\n${emitBlock(item.doc, indentLevel + 1)}\n${i}`))

    return `${i}${lines.join(`\n${i}`)}`
  }

  return emitBlock(ast)
}

function emitInline(inlines: Ast.Inline[]): string {
  return inlines
    .map(n => {
      switch (n.name) {
        case '':
          return esc(n.txt)
        case 'cs':
          return el('code', esc(n.txt))
        case 'br':
          return '<br/>'
        case 'i':
          return el('i', emitInline(n.body))
        case 'b':
          return el('b', emitInline(n.body))
        case 'a':
          return el('a', emitInline(n.body), [['href', n.href]])
        case 'img':
          return el('img', null, [
            ['alt', n.alt],
            ['src', n.src],
          ])
        default:
          throw new Error('Unexpected AST node: ' + (n as any).name)
      }
    })
    .join('')
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
