import * as Ast from './ast'

//
// Parser
//
export interface ParserOptions {
  markdownMode?: boolean
  transformBlock?: (node: Ast.Block) => Ast.Block[]
  transformInline?: (node: Ast.Inline) => Ast.Inline[]
}

const R = (p: string, flags?: string) => new RegExp(p, flags)

const escapedCharacterPattern = /\\([-!"#$%&'()*+,.:;<=>?@^_`{|}~\/\\\[\]])/

const unescapeAllPattern = R(escapedCharacterPattern.source, 'g')

function unescape(s: string): string {
  return s.replace(unescapeAllPattern, '$1')
}

function trim(s: string): string {
  return s.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
}

export function parser({ markdownMode, transformBlock, transformInline }: ParserOptions = {}): (
  src: string,
) => Ast.Block[] {
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
      // Ignore any extra blank lines
      re: /^(?:[ \t]*(?:$|\n))+/,
      mkNode: () => undefined,
    },
    {
      // need to match \n in the end to make sure the line has no other characters
      // than the bar characters and whitespace
      re: /^ {0,3}(?:[-_\*][ \t]*){3,}(?:$|\n)/,
      mkNode: () => ({ type: 'hr' }),
    },
    {
      re: /^ {0,3}(#{1,6})[ \t]+([^\n]*)/,
      mkNode: r => ({ type: 'h', level: r[1].length, body: parseInline(r[2]) }),
    },
    {
      /*
       * Raw HTML block matcher for paired open/close tags.
       *
       * Pattern breakdown:
       *
       * (<([a-z][a-z0-9-]*)(?: [^>]+)?>[ \t]*\n
       *
       *     Match the opening HTML tag and capture the tag name in capture group 2 for later backreference. The
       *     opening tag must not have any indentation. The tag may optionally have attributes. After the opening tag
       *     we allow optional trailing whitespace before the mandatory newline. Note the capture group 1 capturing the
       *     entire raw html starts at the beginning of the regex and continues to the next part.
       *
       * (?:(?!\n<\/\2>[ \t]*(?:$|\n[ \t]*(?:$|\n))).)*\n<\/\2>)
       *
       *     The content is then matched character by character with a negative lookahead that prevents consuming past
       *     the point where the closing tag appears followed by the two mandatory EOLs. The closing tag must match
       *     the same tag name as the opening tag via the \2 backreference and have no indentation. After the content
       *     itself we still need to capture the newline and the closing tag. The capture group 1 ends at the end of
       *     this part.
       *
       * [ \t]*(?:$|\n[ \t]*(?:$|\n))
       *
       *     After the closing tag we consume the double EOL that the raw HTML block requires (and any extra
       *     whitespace before them). It was already matched by the lookahead, but for convenience we consume it here
       *     as well so that the next parser iteration doesn't have to deal with it.
       */
      re: /^(<([a-z][a-z0-9-]*)(?: [^>]+)?>[ \t]*\n(?:(?!\n<\/\2>[ \t]*(?:$|\n[ \t]*(?:$|\n))).)*\n<\/\2>)[ \t]*(?:$|\n[ \t]*(?:$|\n))/s,
      mkNode: r => ({ type: 'htm', raw: r[1] }),
    },
    {
      /*
       * Fenced code block matcher that supports variable-length backtick fences and optional indentation.
       *
       * Pattern breakdown:
       *
       * ( {0,3})(`{3,})
       *
       *     Match the opening fence: up to 3 spaces of indentation (capture group 1) followed by three or more
       *     backticks (capture group 2). Both groups are captured so they can be used later to match the closing
       *     fence with the same indentation and at least the same number of backticks.
       *
       * ((?:[^\\\n`]|\\.)*)\n
       *
       *     The info text after the opening backticks (capture group 3). The alternation matches any character except
       *     backslash, newline or backtick, or any backslash-escaped character. Unescaped backticks are not allowed to
       *     avoid ambiguity with code span. A mandatory newline ends the info text and marks the start of the code
       *     block content.
       *
       * (?:$|\1\2|((?:(?!$|\n\1\2).)*(?:$|\n))(?:$|\1\2[ \t]*(?:$|\n)))
       *
       *     Next the content of the code block and the closing fence are matched. The first two top-level alternatives
       *     handle the cases where the EOF or the closing fence is found immediately, meaning the content is empty.
       *
       *     The third top-level alternative handles the case where there is some content and consists of two
       *     sub-parts. The first one is the capture group 4 which captures the content until EOF or the closing fence
       *     by using a negative lookahead to ensure we don't consume the closing fence. The final newline before the
       *     closing fence is considered part of the content and needs to be captured as well.
       *
       *     After the content is captured, in the second sub-part of the third top-level alternative, we consume the
       *     closing fence (unless the EOF was already reached), which was already matched (but not consumed)
       *     earlier by the lookahead. Finally we have optional trailing whitespace and a mandatory EOL after the
       *     closing fence.
       *
       *     (?:
       *       $                              # no content, immediate EOF
       *     |
       *       \1\2                           # no content, immediate closing fence
       *     |
       *       ((?:(?!$|\n\1\2).)*(?:$|\n))   # Content (capture group 4)
       *       (?:$|\1\2[ \t]*(?:$|\n))       # EOF or the closing fence, optional whitespace, EOL
       *     )
       */
      re: /^( {0,3})(`{3,})((?:[^\\\n`]|\\.)*)\n(?:$|\1\2|((?:(?!$|\n\1\2).)*(?:$|\n))(?:$|\1\2[ \t]*(?:$|\n)))/s,
      mkNode: r => ({
        type: 'cb',
        infoText: unescape(trim(r[3])),
        txt: (r[4] || '').replace(R(`^${r[1]}`), '').replace(R(`\\n${r[1]}`, 'g'), '\n'),
      }),
    },
  ]

  const blockQuoteRule: SimpleRule<Ast.BlockQuote> = {
    re: /^(?: {0,3}>[^\n]*(?:$|\n))+/,
    mkNode: r => {
      const content = r[0].replace(/(^|\n) {0,3}> ?/g, '\n')

      return { type: 'bq', doc: parseBlock(content) }
    },
  }

  const markerRe = (marker: string) => marker.replace(/[-+*).]/, '\\$&').replace(/\d/g, '\\d')
  const listRule: LookaheadRule<Ast.List> = {
    // TODO: explain, add tests for all variations
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

        return { type: 'li', doc: parseBlock(itemContent) }
      })

      return { type: 'l', startNumber: parseInt(pr[3], 10) || undefined, items }
    },
  }

  const containerBlockRules: Rule<Ast.ContainerBlock>[] = [blockQuoteRule, listRule]

  function splitTableRow(row: string): string[] {
    // Match each |cell| pair using the same cell-content alternation as the table regex.
    // The trailing pipe produces one extra empty capture that we discard with slice(0, -1).
    return [...row.matchAll(/\|((?:[^|\\\n]|\\.)*)/gs)].slice(0, -1).map(r => trim(r[1]))
  }

  function normalizeTableRow(cells: string[], colCount: number): string[] {
    if (cells.length >= colCount) return cells
    return [...cells, ...Array(colCount - cells.length).fill('')]
  }

  const tableRule: SimpleRule<Ast.Table> = {
    /*
     * Table matcher for GFM-style pipe tables.
     *
     * Pattern breakdown:
     *
     * (\|(?:(?:[^|\\\n]|\\.)*\|)+)[ \t]*\n
     *
     *     The header row: must start and end with `|` and contain at least one cell. Cell content is
     *     matched by the alternation (?:[^|\\\n]|\\.) which accepts any character except pipe, backslash
     *     or newline, or any backslash-escaped character. This allows escaped pipes \| in cell content.
     *     Trailing whitespace after the last pipe is consumed but not captured.
     *
     * (\|(?:[ \t]*-[-\t ]*\|)+)[ \t]*\n
     *
     *     The delimiter row: pipe-separated cells containing at least one dash and optional surrounding
     *     whitespace.
     *
     * ((?:\|(?:(?:[^|\\\n]|\\.)*\|)+[ \t]*\n)*)
     *
     *     Zero or more body rows with the same structural rules as the header row. The regex does not
     *     enforce column count — normalization is handled in mkNode.
     */
    re: /^(\|(?:(?:[^|\\\n]|\\.)*\|)+)[ \t]*\n(\|(?:[ \t]*-[-\t ]*\|)+)[ \t]*\n((?:\|(?:(?:[^|\\\n]|\\.)*\|)+[ \t]*\n)*)/s,
    mkNode: r => {
      const headerCells = splitTableRow(r[1])
      const delimCells = splitTableRow(r[2])
      const bodyRows = r[3]
        ? r[3]
            .replace(/\n$/, '')
            .split('\n')
            .map(splitTableRow)
        : []

      const colCount = Math.max(headerCells.length, delimCells.length, ...bodyRows.map(r => r.length))

      const parseRow = (cells: string[]) => normalizeTableRow(cells, colCount).map(parseInline)

      return { type: 'tbl', rows: [headerCells, ...bodyRows].map(parseRow) }
    },
  }

  const paragraphRule: SimpleRule<Ast.LeafBlock> = {
    re: /^(.(?!\n( {0,3}(#{1,6}[ \t]|`{3,}[^\n`]*\n|>|\||([-+*]|\d{1,9}[).]) {1,3}[^\n])|[ \t]*($|\n))))*./s,
    mkNode: r => ({ type: 'p', body: parseInline(r[0]) }),
  }

  const blockRules: Rule<Ast.Block>[] = [
    ...priorityLeafBlockRules,
    tableRule,
    ...containerBlockRules,
    paragraphRule,
  ]

  const litemarkupIb: SimpleRule<Ast.Inline>[] = [
    /*
     * Emphasis matchers for LiteMarkup mode that only support *bold* and _italic_ with single markers.
     *
     * Pattern breakdown:
     *
     * _
     *
     *     First we match the opening marker which can be either an asterisk for bold or an underscore for italic.
     *
     * ((?:[^\\_`]|\\.)+)
     *
     *     Then we match the content of the emphasis. The left side of the alternation matches any character except
     *     backslash, closing marker or a backtick, and the right side matches any character escaped with a backslash.
     *
     * _
     *
     *     Finally we match the corresponding closing marker.
     */
    {
      re: /^_((?:[^\\_`]|\\.)+)_/s,
      mkNode: r => ({
        type: 'i',
        body: parseInline(r[1]),
      }),
    },
    {
      re: /^\*((?:[^\\*`]|\\.)+)\*/s,
      mkNode: r => ({
        type: 'b',
        body: parseInline(r[1]),
      }),
    },
  ]

  const markdownIb: SimpleRule<Ast.Inline>[] = [
    /*
     * Emphasis matchers for Markdown mode that support **bold** / __bold__ and *italic* / _italic_.
     *
     * Pattern breakdown for the bold matcher:
     *
     * (?=([_*]))\1\1
     *
     *     The lookahead captures the marker character (* or _) without consuming it. Then \1\1 consumes
     *     two of that character as the opening delimiter. The lookahead prevents backtracking from trying
     *     a single-character match when no closing double marker is found — the same technique used in
     *     the code span matcher.
     *
     * ((?:(?!\1\1)[^\\`]|\\.)+)
     *
     *     Content of the bold span. Each character is checked with a negative lookahead to ensure we
     *     haven't reached the closing double marker. The left side of the alternation matches any
     *     character except backslash, backtick or the closing delimiter, and the right side matches
     *     backslash-escaped characters verbatim. Backticks are excluded so that code spans take priority.
     *
     * \1\1
     *
     *     The closing double marker, matching the same character as the opening.
     */
    {
      re: /^(?=([_*]))\1\1((?:(?!\1\1)[^\\`]|\\.)+)\1\1/s,
      mkNode: r => ({
        type: 'b',
        body: parseInline(r[2]),
      }),
    },
    {
      re: /^([_*])((?:(?!\1)[^\\`]|\\.)+)\1/s,
      mkNode: r => ({
        type: 'i',
        body: parseInline(r[2]),
      }),
    },
  ]

  const inlineRules: SimpleRule<Ast.Inline>[] = [
    {
      /*
       * Code span matcher that supports backticks in code span content by allowing the opening and closing backtick
       * sequences to be of any length as long as they match each other.
       *
       * Pattern breakdown:
       *
       * (?=(`+))\1
       *
       *     First part of the regex captures the opening backticks so that we can match the same number of backticks in
       *     the closing sequence. This allows us to support code spans that contain backticks by simply using more
       *     backticks to wrap the code span.
       *
       *     The positive lookahead is used instead of a simple (`+) to prevent backtracking in the opening sequence.
       *     In case of an input such as ``a` the naive (`+) would first match the two backticks and then fail to find
       *     the closing sequence, thus backtracking to match just the first backtick. This would then cause the second
       *     backtick to be consumed as part of the code span content.
       *
       *     The lookahead ensures that the entire code span pattern fails immediately when a matching closing sequence
       *     is not found. The parser then proceeds to use the text node matcher to consume the first backtick as a
       *     normal character and during the next parser iteration this pattern can successfully match the code span
       *     with a single backtick as the opening and closing sequence.
       *
       * ((?:(?!\1).)*)
       *
       *     The second part of the regex captures the content of the code span. The core of this part is the
       *     negative lookahead that checks that we don't have the closing backtick sequence ahead.
       *
       * \1
       *    Finally we match the closing backtick sequence by referring to the first capturing group. This guarantees
       *    that the number of backticks in the closing sequence matches the number of backticks in the opening
       *    sequence.
       */
      re: /^(?=(`+))\1((?:(?!\1).)*)\1/s,
      mkNode: r => ({
        type: 'cs',
        txt: ((s: string) => {
          // We trim away first and last space so that you can start codespan content with a backtick:
          // `` ` `` will render just the backtick without surrounding space
          const trimSpaces = s.length >= 3 && s[0] == ' ' && s[1] !== ' ' && s[s.length - 1] == ' '

          return (trimSpaces ? s.slice(1, -1) : s).replace(/\n/g, ' ')
        })(r[2] || ''),
      }),
    },
    {
      re: /^\\(?:\n|$)/,
      mkNode: () => ({
        type: 'br',
      }),
    },
    {
      re: R(`^${escapedCharacterPattern.source}`),
      mkNode: r => ({
        type: '',
        txt: r[1],
      }),
    },
    ...(markdownMode ? markdownIb : litemarkupIb),
    {
      /*
       * Link node matcher that supports nested brackets in the link body for image tags and two different syntaxes for
       * the link url (angle brackets or parentheses).
       *
       * Pattern breakdown:
       *
       * \[((?:[^\\\[\]]|\\.)*(?:!\[(?:[^\\\[\]]|\\.)*\](?:[^\\\[\]]|\\.)*)*)\]
       *
       *     The first section of the regex tries to parse the link body until the closing bracket.
       *
       *     The overall structure of this section is \[(A*(?:!\[A*\]A*)*)\] where A is the alteration
       *     (?:[^\\\[\]]|\\.). The first part of the alteration parses any basic content of the link body
       *     and the second part parses anything escaped with a backslash verbatim. This core pattern alone
       *     does not accept nested brackets (nested brackets).
       *
       *     The first instance of A* is used to parse any basic content of the link body until any nested
       *     brackets. However, if an opening bracket is found, preceded by an exclamation mark, we know that
       *     we have an image tag, and the second sub-part which starts with the exclamation sign matches.
       *     This second sub-part tries to parse the body of the image tag (alt text) with the same A* pattern
       *     until a matching inner closing bracket is found. After that we have a third sub-part to parse any
       *     remainder of the body, again with the A* pattern until the actual closing bracket. This way we can
       *     support images within links.
       *
       *     In this part we don't care if the image tag is otherwise properly formed; we are simply trying to
       *     match balanced brackets so that the entire link body can be parsed.
       *
       * (?:<((?:[^\\>]|\\.)+)>|\(((?:[^\\\)]|\\.)+)\))
       *
       *     After the body has been parsed the second section of the regex matches the link url which can be
       *     either in angle brackets or parentheses. Hence the two alternatives at the end of the regex. Both
       *     are constructed with a similar alternation where the first part matches anything except escaped
       *     characters and the closing angle bracket or parenthesis, and the second part matches anything
       *     escaped with a backslash verbatim.
       *
       *     While the url part allows for anything except closing angle bracket or parentheses (even an opening
       *     angle bracket or parenthesis), the link body parsing is more strict and does not allow opening
       *     brackets unless balanced with a closing bracket after an exclamation mark. In other words, any
       *     brackets in the link body not part of an image tag should be escaped even though a broken image tag
       *     with balanced brackets would be accepted as part of the link body. This is to keep the link parsing
       *     simple.
       *
       * Similarities to image regex:
       *
       * The second section of the regex should be identical to the one used in the image regex below, as the
       * syntax for the link url is the same for both links and images.
       */
      re: /^\[((?:[^\\\[\]]|\\.)*(?:!\[(?:[^\\\[\]]|\\.)*\](?:[^\\\[\]]|\\.)*)*)\](?:<((?:[^\\>]|\\.)+)>|\(((?:[^\\\)]|\\.)+)\))/s,
      mkNode: r => ({
        type: 'a',
        body: parseInline(r[1]),
        href: r[2] || r[3],
      }),
    },
    {
      /*
       * Image node matcher that supports the same two syntaxes for the link url as the link node matcher (angle
       * brackets or parentheses)
       *
       * Pattern breakdown:
       *
       * !\[((?:[^\\\[\]]|\\.)*)\]
       *
       *    The first part of the regex matches the alt text of the image which is enclosed in square brackets and
       *    starts with an exclamation mark. The content of the alt text is parsed with the same alteration as in the
       *    link body parsing of the link regex, but without the possibility for nested brackets. See above for details
       *    on the alteration pattern.
       *
       *    Note that while link body parsing allows for nested brackets (for image tags), the alt text parsing does
       *    not. Instead brackets in alt text must always be escaped. This is in line with the general rule that
       *    applies for link body as well that brackets must be escaped within brackets. (Only exception being an image
       *    tag within a link.)
       *
       * (?:<((?:[^\\>]|\\.)+)>|\(((?:[^\\\)]|\\.)+)\))
       *
       *    After the alt text has been parsed the second section of the regex matches the link url which can be either
       *    in angle brackets or parentheses. This part is identical to the link url parsing part of the link regex.
       *    See the link regex breakdown above for details on this part of the pattern.
       */
      re: /^!\[((?:[^\\\[\]]|\\.)*)\](?:<((?:[^\\>]|\\.)+)>|\(((?:[^\\\)]|\\.)+)\))/s,
      mkNode: r => ({
        type: 'img',
        alt: unescape(r[1]),
        src: r[2] || r[3],
      }),
    },
    {
      /*
       * Text node matcher that consumes characters that don't start special inline constructs.
       *
       * Pattern breakdown:
       *
       * (?:.(?![`\\_*\[!]))*
       *
       *     Greedily match characters as long as the next character is not a special starter that can start an inline
       *     construct (code span, escaped char, emphasis, link, image). Note that the last character before the special
       *     character is *not* consumed by this part of the regex but the next part will consume it.
       *
       * (?:.|$)
       *
       *     The second part of the regex guarantees that we always consume at least single character of the remaining
       *     input (including special character). This way we can also consume extra special characters that are not
       *     actually starting a valid inline construct. For example a single underscore that is not followed by valid
       *     emphasis text will be consumed as a plain text character by this part of the regex.
       */
      re: /^(?:.(?![`\\_*\[!]))*(?:.|$)/s,
      mkNode: r => ({
        type: '',
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
        // None of the rules matched meaning we have a bug as we want parser to accept all input
        throw new Error('Failed to parse: ' + remaining.slice(0, 200))
      }
    }

    // console.log('done parsing')
    return ast
  }

  function mergeConsecutiveTextNodes(inlines: Ast.Inline[]): Ast.Inline[] {
    const merged: Ast.Inline[] = []

    for (let n of inlines) {
      const lastNode = merged[merged.length - 1]
      if (n.type === '' && lastNode?.type === '') {
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
    return flatMapOpt(
      mergeConsecutiveTextNodes(parse<Ast.Inline>(src, inlineRules)),
      transformInline,
    )
  }

  return parseBlock
}
