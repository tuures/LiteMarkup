import * as Ast from './ast'

//
// HTML emitter
//

const repeat = (s: string) => (times: number) => Array(times + 1).join(s)

const indentChars = '  '
const indent = repeat(indentChars)

export function astToHtml(ast: Ast.Block[], indentLevel = 0): string {
  const nextLevel = indentLevel + 1
  const i = indent(indentLevel)
  const ii = indent(indentLevel + 1)

  const lines = ast.map(b => {
    switch (b.name) {
      case 'bq':
        return el('blockquote', `\n${astToHtml(b.doc, nextLevel)}\n`)
      case 'l': {
        const items = b.items.map(item =>
          el('li', `\n${astToHtml(item.doc, nextLevel + 1)}\n${ii}`)
        )

        const containerTag = b.startNumber ? 'ol' : 'ul'

        return el(containerTag, `\n${ii}${items.join(`\\n${ii}`)}\n`, b.startNumber ? [['start', String(b.startNumber)]] : [])
      }
      case 'hr':
        return '<hr/>'
      case 'h':
        return el(`h${b.level}`, emitInline(b.body))
      case 'htm':
        return b.raw
      case 'cb':
        return el('pre', el('code', esc(b.txt), b.infoText ? [['data-infotext', b.infoText]] : []))
      case 'p':
        return el('p', emitInline(b.body))
      default:
        throw new Error('Unexpected ast node: ' + (b as any).name)
    }
  })
  return `${i}${lines.join(`\n${i}`)}`
}

function emitInline(inline: Ast.Inline[]): string {
  return inline.map(i => {
    switch (i.name) {
      case '':
        return esc(i.txt)
      case 'cs':
        return el('code', esc(i.txt))
      case 'br':
        return '<br/>'
      case 'i':
        return el('span', emitInline(i.body), [['style', 'font-style: italic;']])
      case 'b':
        return el('span', emitInline(i.body), [['style', 'font-weight: bold;']])
      case 'a':
        return el('a', emitInline(i.body), [['href', i.href]])
      case 'img':
          return el('img', null, [['alt', i.alt], ['src', i.src]])
      default:
        throw new Error('Unexpected ast node: ' + (i as any).name)
    }
  }).join('')
}

const esc = (txt: string) => txt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace(`'`, '&apos;')

function el(tagName: string, body: string | null, attr: Array<[string, string]> = []) {
  const attributes = attr.map(a =>
    `${a[0]}="${esc(a[1])}"`
  ).join(' ')

  const start = `<${tagName}${attributes.length ? ' ' : ''}${attributes}`
  const end = body ? `>${body}</${tagName}>` : '/>'
  return start + end
}
