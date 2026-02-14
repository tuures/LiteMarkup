import * as Ast from './ast'

//
// Parser
//
export interface ParserOptions {
  markdownMode?: boolean
  transformBlock?: (node: Ast.Block) => Ast.Block[]
  transformInline?: (node: Ast.Inline) => Ast.Inline[]
}

export function parseToAst({ markdownMode, transformBlock, transformInline }: ParserOptions = {}) {
  const R = (p: string, flags?: string) => new RegExp(p, flags)

  type Rule<N> = SimpleRule<N> | LookaheadRule<N>

  interface SimpleRule<N> {
    pre?: undefined
    re: RegExp
    mkNode: (r: RegExpExecArray) => N | undefined
  }

  interface LookaheadRule<N> {
    pre: RegExp
    re: (pr: RegExpExecArray) => RegExp
    mkNode: (pr: RegExpExecArray, r: RegExpExecArray) => N | undefined
  }

  const priorityLeafBlockRules: SimpleRule<Ast.LeafBlock>[] = [
    {
      re: /^(?:[ \t]*(?:$|\n))+/,
      mkNode: r => undefined,
    },
    {
      // need to match \n in the end to make sure the line has no other characters
      // than the bar characters and whitespace
      re: /^ {0,3}(?:[-_\*][ \t]*){3,}(?:$|\n)/,
      mkNode: r => ({ name: 'hr' }),
    },
    {
      re: /^ {0,3}(#{1,6})[ \t]+([^\n]*)/,
      mkNode: r => ({ name: 'h', level: r[1].length, body: parseInline(r[2]) }),
    },
    {
      re: /^(<([^>]+)>[ \t]*\n(?:[^](?!\n<\/\2>(?:[ \t]*\n){2}))*[^]\n<\/\2>)[ \t]*(?:$|\n(?:$|[ \t]*\n))/,
      mkNode: r => ({ name: 'htm', raw: r[1] }),
    },
    {
      re: /^( {0,3})(`{3,})([^\n`]*)\n(?:(?:\1\2|(?:(\n|(?:(?:[^](?!\n\1\2))*[^]\n))\1\2))[ \t]*(?:$|\n)|([^]*))/,
      mkNode: r => ({
        name: 'cb',
        infoText: r[3].replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''),
        txt: (r[4] || r[5] || '').replace(R(`^${r[1]}`), '').replace(R(`\\n${r[1]}`, 'g'), '\n'),
      }),
    },
  ]

  const blockQuoteRule: SimpleRule<Ast.BlockQuote> = {
    re: /^(?: {0,3}>\n)*(?: {0,3}>[^\n]+(?:$|\n))+(?: {0,3}>(?:$|\n))*/,
    mkNode: r => {
      const content = r[0].replace(/(^|\n) {0,3}> ?/g, '\n')

      return { name: 'bq', doc: parseBlock(content) }
    },
  }

  const markerRe = (marker: string) => marker.replace(/[-+*).]/, '\\$&').replace(/\d/g, '\\d')
  const listRule: LookaheadRule<Ast.List> = {
    pre: /^(( {0,3})([-+*]|\d{1,9}[).])( {1,3}))([^\n]+)/,
    re: pr => {
      const markerEscaped = markerRe(pr[3])
      return R(String.raw`(?:\n+${pr[2]}(?: {${pr[3].length}}|${markerEscaped})${pr[4]}[^\n]*)*`)
    },
    mkNode: (pr, r) => {
      const markerIndent = R('\\n' + markerRe(pr[1]))
      const afterInitialMarkerIndent = pr[5] + r[0]
      const items: Ast.ListItem[] = afterInitialMarkerIndent.split(markerIndent).map(itemSlice => {
        const itemContent = itemSlice.replace(R(`\\n {${pr[1].length}}`, 'g'), '\n')

        return { name: 'li', doc: parseBlock(itemContent) }
      })

      return { name: 'l', startNumber: parseInt(pr[3], 10) || undefined, items }
    },
  }

  const containerBlockRules: Rule<Ast.ContainerBlock>[] = [blockQuoteRule, listRule]

  const paragraphRule: SimpleRule<Ast.LeafBlock> = {
    re: /^([^](?!\n( {0,3}(#{1,6}[ \t]|`{3,}[^\n`]*\n|>|([-+*]|\d{1,9}[).]) {1,3}[^\n])|[ \t]*($|\n))))*[^]/,
    mkNode: r => ({ name: 'p', body: parseInline(r[0]) }),
  }

  const blockRules: Rule<Ast.Block>[] = [
    ...priorityLeafBlockRules,
    ...containerBlockRules,
    paragraphRule,
  ]

  const litemarkupIb: SimpleRule<Ast.Inline>[] = [
    {
      re: /^_((?:[^\\_`]|\\[^])+)_/,
      mkNode: r => ({
        name: 'i',
        body: parseInline(r[1]),
      }),
    },
    {
      re: /^\*((?:[^\\*`]|\\[^])+)\*/,
      mkNode: r => ({
        name: 'b',
        body: parseInline(r[1]),
      }),
    },
  ]

  const markdownIb: SimpleRule<Ast.Inline>[] = [
    {
      re: /^([_*])((?:(?!\1)[^\\`]|\\[^])+)\1/,
      mkNode: r => ({
        name: 'i',
        body: parseInline(r[2]),
      }),
    },
    {
      re: /^([_*]{2})((?:(?!\1)[^\\`]|\\[^])+)\1/,
      mkNode: r => ({
        name: 'b',
        body: parseInline(r[2]),
      }),
    },
  ]

  const inlineRules: SimpleRule<Ast.Inline>[] = [
    {
      re: /^(?=(`+))\1(([^](?!\1))*[^])?(\1)/,
      mkNode: r => ({
        name: 'cs',
        txt: ((s: string) => {
          // so that you can start codespan content with a backtick:
          // `` ` `` will render just the backtick without surrounding space
          const trimSpaces = s.length >= 3 && s[0] == ' ' && s[1] !== ' ' && s[s.length - 1] == ' '

          return (trimSpaces ? s.slice(1, -1) : s).replace(/\n/g, ' ')
        })(r[2] || ''),
      }),
    },
    {
      re: /^\\(?:\n|$)/,
      mkNode: r => ({
        name: 'br',
      }),
    },
    {
      re: /^\\([-!"#$%&'()*+,.:;<=>?@^_`{|}~\/\\\[\]])/,
      mkNode: r => ({
        name: '',
        txt: r[1],
      }),
    },
    ...(markdownMode ? markdownIb : litemarkupIb),
    {
      re: /^\[((?:[^\\\]`]|\\[^])+)\](?:<((?:[^\\>`]|\\[^])+)>|\(((?:[^\\\)`]|\\[^])+)\))/,
      mkNode: r => ({
        name: 'a',
        body: parseInline(r[1]),
        href: r[2] || r[3],
      }),
    },
    {
      re: /^!\[((?:[^\\\]`]|\\[^])+)\](?:<((?:[^\\>`]|\\[^])+)>|\(((?:[^\\\)`]|\\[^])+)\))/,
      mkNode: r => ({
        name: 'img',
        alt: r[1],
        src: r[2] || r[3],
      }),
    },
    {
      re: /^(?=(`*))\1([^](?![`\\_*\[!]))*(?:[^]|$)/,
      mkNode: r => ({
        name: '',
        txt: r[0],
      }),
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
            ? rule.re(preMatch).exec(remaining.slice(matchedLength))
            : rule.re.exec(remaining)
          if (match) {
            matchedLength += match[0].length
            // console.log(`PARSED: ${(rule.pre || rule.re).source}  ->  `, preMatch, match)
            const astNode = rule.pre ? rule.mkNode(preMatch, match) : rule.mkNode(match)
            if (astNode) {
              ast.push(astNode)
            }
            break
          }
        }
      }

      if (matchedLength > 0) {
        remaining = remaining.slice(matchedLength)
      } else {
        // if we get here we have a bug as we want parser to accept all input
        throw new Error('Failed to parse: ' + remaining.slice(0, 200))
      }
    }

    // console.log('done parsing')
    return ast
  }

  function mergeConsecutiveTextNodes(inlines: Ast.Inline[]): Ast.Inline[]{
    const merged: Ast.Inline[] = []

    for(let n of inlines){
      const lastNode = merged[merged.length - 1]
      if(n.name === '' && lastNode?.name === ''){
        lastNode.txt += n.txt
      } else {
        merged.push(n)
      }
    }

    return merged
  }

  function flatMapOpt<N>(a: N[], f: undefined | ((node: N) => N[])): N[] {
    return f ? a.flatMap(f) : a
  }

  function parseBlock(src: string) {
    return flatMapOpt(parse<Ast.Block>(src, blockRules), transformBlock)
  }

  function parseInline(src: string) {
    return flatMapOpt(mergeConsecutiveTextNodes(parse<Ast.Inline>(src, inlineRules)), transformInline)
  }

  return parseBlock
}
