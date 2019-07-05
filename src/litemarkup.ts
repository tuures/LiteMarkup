// TODO: separate AST, parsing, rendering to separate files

//
// AST
//

export interface Text {
  name: ''
  txt: string
}

export interface CodeSpan {
  name: 'cs'
  txt: string
}

export interface HardLineBreak {
  name: 'br'
}

export interface Italic {
  name: 'i'
  body: Inline[]
}

export interface Bold {
  name: 'b'
  body: Inline[]
}

export interface Link {
  name: 'a'
  body: Inline[],
  href: string
}

export interface Image {
  name: 'img',
  alt: string,
  src: string
}

export type Inline = Text | CodeSpan | HardLineBreak | Italic | Bold | Link | Image

export interface BlockQuote {
  name: 'bq'
  doc: Block[]
}

export interface List {
  name: 'l'
  startNumber: number | undefined
  items: ListItem[]
}

export type ContainerBlock = BlockQuote | List

export interface ListItem {
  name: 'li'
  doc: Block[]
}

export interface ThematicBreak {
  name: 'hr'
}

export interface Heading {
  name: 'h'
  level: number
  body: Inline[]
}

export interface HtmlBlock {
  name: 'htm'
  raw: string
}

export interface CodeBlock {
  name: 'cb',
  infoText: string,
  txt: string
}

export interface Paragraph {
  name: 'p'
  body: Inline[]
}

export type LeafBlock = ThematicBreak | Heading | HtmlBlock | CodeBlock | Paragraph

export type Block = ContainerBlock | LeafBlock

//
// Parser
//

const repeat = (s: string) => (times: number) => Array(times + 1).join(s)
const R = (p: string, flags?: string) => new RegExp(p, flags)

type Rule<N> = SimpleRule<N> | LookaheadRule<N>

interface SimpleRule<N> {
  pre?: undefined,
  re: RegExp
  mkNode: (r: RegExpExecArray) => N | undefined
}

interface LookaheadRule<N> {
  pre: RegExp,
  re: (pr: RegExpExecArray) => RegExp
  mkNode: (pr: RegExpExecArray, r: RegExpExecArray) => N | undefined
}

const priorityLeafBlockRules: SimpleRule<LeafBlock>[] = [
  {
    re: /^(?:[ \t]*\n)+/,
    mkNode: r => undefined,
  },
  {
    // need to match \n in the end to make sure the line has no other characters
    // than the bar characters and whitespace
    re: /^ {0,3}(?:[-_\*][ \t]*){3,}($|\n)/,
    mkNode: r => ({ name: 'hr' }),
  },
  {
    re: /^ {0,3}(#{1,6})[ \t]+([^\n]*)/,
    mkNode: r => ({ name: 'h', level: r[1].length, body: parse(r[2], inlineRules) }),
  },
  {
    re: /^(<([^>]+)>[ \t]*\n(?:[^](?!<\/\2>(?:[ \t]*\n){2}))*[^]<\/\2>)[ \t]*(?:$|\n(?:$|[ \t]*\n))/,
    mkNode: r => ({ name: 'htm', raw: r[1]}),
  },
  {
    re: /^( {0,3})(`{3,})([^\n`]*)\n(?:(?:\1\2|(?:(\n|(?:(?:[^](?!\n\1\2))*[^]\n))\1\2))[ \t]*(?:$|\n)|([^]*))/,
    mkNode: r => ({
      name: 'cb',
      infoText: r[3].replace(/^[ \t]+/,'').replace(/[ \t]+$/,''),
      txt: (r[4] || r[5] || '').replace(R(`^${r[1]}`), '').replace(R(`\\n${r[1]}`, 'g'), '\n')
    }),
  },
]

const blockQuoteRule: SimpleRule<BlockQuote> = {
  re: /^ {0,3}> ?((?:[^](?!\n[ \t]*\n))+[^])/,
  mkNode: r => {
    const content = r[1].replace(/\n {0,3}(> ?)?/g, '\n')

    return { name: 'bq', doc: parse(content, blockRules) }
  },
}

const markerRe = (marker: string) => marker.replace(/[-+*).]/, '\\$&').replace(/\d/g, '\\d')
const listRule: LookaheadRule<List> = {
  pre: /^(( {0,3})([-+*]|\d{1,9}[).])( {1,3}))([^\n]+)/,
  re: pr => {
    const markerEscaped = markerRe(pr[3])
    return R(String.raw`(?:\n+${pr[2]}(?: {${pr[3].length}}|${markerEscaped})${pr[4]}[^\n]*)*`)
  },
  mkNode: (pr, r) => {
    const markerIndent = R(markerRe(pr[1]))
    const afterInitialMarkerIndent = pr[5] + r[0]
    const items: ListItem[] = afterInitialMarkerIndent.split(markerIndent).map(itemSlice => {
      const itemContent = itemSlice.replace(R(`\\n {${pr[1].length}}`, 'g'), '\n')

      return { name: 'li', doc: parse(itemContent, blockRules) }
    })

    return { name: 'l', startNumber: parseInt(pr[3], 10) || undefined, items }
  },
}

const containerBlockRules: Rule<ContainerBlock>[] = [
  blockQuoteRule,
  listRule,
]

const paragraphRule: SimpleRule<LeafBlock> = {
  re: /^([^](?!\n( {0,3}(#{1,6}[ \t]|`{3,}[^\n`]*\n|>|([-+*]|\d{1,9}[).]) {1,3}[^\n])|[ \t]*($|\n))))*[^]/,
  mkNode: r => ({ name: 'p', body: parse(r[0], inlineRules) }),
}

const blockRules: Rule<Block>[] = [...priorityLeafBlockRules, ...containerBlockRules, paragraphRule]

const inlineRules: SimpleRule<Inline>[] = [
  {
    re: /^(?=(`+))\1(([^](?!\1))*[^])?(\1)/,
    mkNode: r => ({
      name: 'cs',
      txt: ((s: string) => {
        const trimSpaces = (s.length >= 3 && s[0] == ' ' && s[1] !== ' ' && s[s.length - 1] == ' ')

        return (trimSpaces ? s.slice(1, -1) : s).replace(/\n/g, ' ')
      })(r[2] || ''),
    })
  },
  {
    re: /^\\(\n|$)/,
    mkNode: r => ({
      name: 'br'
    })
  },
  {
    re: /^\\([-!"#$%&'()*+,.:;<=>?@^_`{|}~\/\\\[\]])/,
    mkNode: r => ({
      name: '',
      txt: r[1]
    })
  },
  {
    re: /^_([^_`]*[^\\_`])_/,
    mkNode: r => ({
      name: 'i',
      body: parse(r[1], inlineRules)
    })
  },
  {
    re: /^\*([^*`]*[^\\*`])\*/,
    mkNode: r => ({
      name: 'b',
      body: parse(r[1], inlineRules)
    })
  },
  {
    re: /^\[((?:[^\\\]`]|\\[^])+)\]\(((?:[^\\\)`]|\\[^])+)\)/,
    mkNode: r => ({
      name: 'a',
      body: parse(r[1], inlineRules),
      href: r[2],
    })
  },
  {
    re: /^!\[((?:[^\\\]`]|\\[^])+)\]\(((?:[^\\\)`]|\\[^])+)\)/,
    mkNode: r => ({
      name: 'img',
      alt: r[1],
      src: r[2],
    })
  },
  {
    re: /^(?=(`*))\1([^](?![`\\_*\[]))*[^]/,
    mkNode: r => ({
      name: '',
      txt: r[0],
    })
  },
]

const emptyMatch = /^/.exec('')

function parse<N>(src: string, rules: Rule<N>[]): N[] {
  // console.log('parsing...')
  let remaining = src

  const ast: N[] = []

  while (remaining.length > 0) {
    // console.log(`remaining: "${remaining.substr(0, 200)}"`)
    let matchedLength = 0
    for (let rule of rules) {
      const preMatch = rule.pre ? rule.pre.exec(remaining) : emptyMatch
      matchedLength += preMatch ? preMatch[0].length : 0
      if (preMatch) {
        const match = rule.pre
          ? rule.re(preMatch).exec(remaining.substr(matchedLength))
          : rule.re.exec(remaining)
        if (match) {
          matchedLength += match[0].length
          // console.log(`PARSED: ${(rule.pre || rule.re).source}  ->  `, preMatch, match)
          const astNode = rule.pre ? rule.mkNode(preMatch, match) : rule.mkNode(match)
          if (astNode) {
            // console.log(`MKNODE: ${JSON.stringify(astNode)}`)
            ast.push(astNode)
          }
          break
        }
      }
    }

    if (matchedLength > 0) {
      remaining = remaining.substr(matchedLength)
    } else {
      throw new Error('unexpected: "' + remaining.substr(0, 200))
    }
  }

  // console.log('done parsing')
  return ast
}

export function mdToAst(src: string): Block[] {
  return parse<Block>(src, blockRules)
}

//
// HTML emitter
//

const indentChars = '  '
const indent = repeat(indentChars)

export function astToHtml(ast: Block[], indentLevel = 0): string {
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

function emitInline(inline: Inline[]): string {
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

//
// Facade
//

export const mdToHtml = (src: string) => astToHtml(mdToAst(src))
