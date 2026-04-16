# ![LiteMarkup](https://tuures.github.io/LiteMarkup/docs/logo-text.svg)

**Tiny Markdown-like parser with a typed, AST-first TypeScript API. Under 3 KB gzipped, zero dependencies.**

[![npm version](https://img.shields.io/npm/v/litemarkup.svg)](https://www.npmjs.com/package/litemarkup)
[![Bundle Size](https://img.shields.io/badge/gzip-<3kb-blue)](https://bundlephobia.com/package/litemarkup)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[![Live demo here](https://img.shields.io/badge/Live_demo-Click_here-brightgreen)](https://tuures.github.io/LiteMarkup/docs/demopage.html)

---

## Why LiteMarkup?

Most Markdown parsers are **bloated** — full CommonMark implementations have edge cases you'll never use. LiteMarkup is different:

- ✅ **Tiny & fast** — less than 3 KB gzipped, zero dependencies, fast parsing
- ✅ **AST-first** — Parse once, render to anything (HTML, React, JSON, plain text...) with ease
- ✅ **TypeScript** — Full type safety for AST out of the box
- ✅ **Simple API** — No complex config, no plugins, no learning curve

**Perfect for:** Comment systems, chat apps, note-taking tools, or anywhere you want lightweight markup without the bloat.

> 💡 **AST-first design:** Unlike libraries that only output HTML, LiteMarkup gives you a clean typed AST. Integrate to custom output formats easily.

[Comparison and performance](#comparison-and-performance)

---

## Quick start

```bash
npm install litemarkup
```

```typescript
import { parser, htmlRenderer } from 'litemarkup'

// Create a parser (optionally with transforms)
const parse = parser(/* options */)

// Parse markup to produce an AST
const ast = parse('# Hello *world*!')
// → [{ type: 'h', level: 1, body: [
//      { type: '', txt: 'Hello ' },
//      { type: 'b', body: [{ type: '', txt: 'world' }] },
//      { type: '', txt: '!' }
//    ]}]

// Produce output, for example with the built-in HTML rendering
const render = htmlRenderer(/* options */)

const html = render(ast)
// → <h1>Hello <b>world</b>!</h1>

// Or bring/build your own rendering: React, DOCX, PDF, ...
// See examples further below
```

There's a convenience shorthand if you want to convert directly to HTML:

```typescript
import { convertToHtml } from 'litemarkup'

// Note that raw html, links and images are converted to text...
convertToHtml('Click [here](/url)!')
// → '<p>Click [here]&lt;/url&gt;!</p>'

// ... unless you allow unsafe HTML. Don’t do this on untrusted input!
convertToHtml('Click [here]<javascript:alert(`You’ve been warned!`);>!', { allowUnsafeHtml: true })
// → '<p>Click <a href="javascript:alert(`You’ve been warned!`);">here</a>!</p>'
```

**That's it.** No complex config, no plugins, no 50KB bundle.

> ⚠️ **Security note:** By default, any HTML blocks, links, and images are textified.\
> This security measure can be disabled with `htmlRenderer({ allowUnsafeHtml: true })` or `convertToHtml(src, { allowUnsafeHtml: true })`.\
> Learn how to selectively [sanitize untrusted input](#sanitizing-untrusted-input) before doing so.

---

## Syntax overview

- ✅ **Headings** — `# H1` through `###### H6`
- ✅ **Bold, Italic & Strikethrough** — `*bold*`, `_italic_`, and `~deleted~`
  (or use [markdown mode](#markdown-compatibility-mode) for `**bold**` / `*italic*` / `~~deleted~~`)

- ✅ **Lists** — Ordered (`1.`) and unordered (`-` or `*`)
- ✅ **Links** — `[text]<url>` or `[text](url)`
- ✅ **Code** — Inline `` `code` `` and fenced blocks
- ✅ **Tables** — GFM-style pipe tables
- ✅ **Blockquotes** — `> quoted text`
- ✅ **Thematic breaks** — `---`
- ✅ **Escape characters** — `\*not bold\*`
- ✅ **Line breaks** — Trailing `\`

[See language tour](#language-tour)

---

## API

```typescript
interface ParserOptions {
  markdownMode?: boolean
  transformBlock?: (node: Ast.Block) => Ast.Block[]
  transformInline?: (node: Ast.Inline) => Ast.Inline[]
}

function parser(o: ParserOptions = {}): (src: string) => Ast.Block[]

export interface HtmlRendererOptions {
  allowUnsafeHtml?: boolean
  indentCharacters?: string
}

function htmlRenderer(o: HtmlRendererOptions = {}): (ast: Ast.Block[]) => string
```

Prefer minimal imports for only what you need?

```typescript
import { parser } from 'litemarkup/parser'

import { htmlRenderer } from 'litemarkup/html'

import type { Block, Inline } from 'litemarkup/ast'
```

### Markdown compatibility mode

By default, LiteMarkup uses `*bold*`, `_italic_`, and `~deleted~`. Enable markdown mode for `**bold**`, `*italic*`, and `~~deleted~~`:

```typescript
import { parser, htmlRenderer } from 'litemarkup'

const parse = parser({ markdownMode: true })

const ast = parse('Hello **world** and *italic* and ~~deleted~~!')
const html = htmlRenderer()(ast)
// → '<p>Hello <b>world</b> and <i>italic</i> and <del>deleted</del>!</p>'
```

### Transforming AST on-the-fly (single pass)

Use `transformBlock` and `transformInline` hooks to modify the AST during parsing:

```typescript
import { parser, htmlRenderer } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

// Example 1: Convert all headings to level 2
const parse = parser({
  transformBlock: (node: Block): Block[] => {
    if (node.type === 'h') {
      return [{ ...node, level: 2 }]
    }
    return [node]
  },
})

// Example 2: Auto-link URLs in text
const parseWithAutoLinks = parser({
  transformInline: (node: Inline): Inline[] => {
    if (node.type === '' && node.txt.includes('http')) {
      const match = node.txt.match(/(https?:\/\/[^\s]+)/)
      if (match) {
        const url = match[1]
        const idx = node.txt.indexOf(url)
        return [
          { type: '', txt: node.txt.slice(0, idx) },
          { type: 'a', href: url, body: [{ type: '', txt: url }] },
          { type: '', txt: node.txt.slice(idx + url.length) },
        ]
      }
    }
    return [node]
  },
})

// Example 3: Remove a node by returning empty array
const parseNoImages = parser({
  transformInline: (node: Inline): Inline[] => (node.type === 'img' ? [] : [node]),
})
```

### Sanitizing untrusted input

Strip or modify dangerous content using transforms depending on your needs. For example:

```typescript
import { parser, htmlRenderer } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

const isSafeUrl = (url: string) => /^https?:\/\//.test(url)

const parse = parser({
  transformBlock: (node: Block): Block[] => {
    // Drop HTML blocks
    if (node.type === 'htm') {
      return []
    }
    return [node]
  },
  transformInline: (node: Inline): Inline[] => {
    // Remove links with unsafe URLs, keep the text
    if (node.type === 'a' && !isSafeUrl(node.href)) {
      return node.body
    }
    // Remove images with unsafe URLs entirely
    if (node.type === 'img' && !isSafeUrl(node.src)) {
      return []
    }
    return [node]
  },
})

// Now that input is sanitized to our liking, we can pass { allowUnsafeHtml: true }
// to let the renderer process the AST in full
htmlRenderer({ allowUnsafeHtml: true })(
  parse('[safe](https://example.com) and [danger](javascript:void)'),
)
// → '<p><a href="https://example.com">safe</a> and danger</p>'
```

### Custom output formats

The AST makes it easy to render to anything — not just HTML.
For example, render directly into React components:

```tsx
import { parser } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

const parse = parser()
const ast = parse('Hello *world*!')

// e.g. create a custom render that outputs React elements
function renderInline(node: Inline) {
  switch (node.type) {
    case '':
      return node.txt
    case 'a':
      return <a href={node.href}>{node.body.map(renderInline)}</a>
    // ... handle other inline types
  }
}

function renderBlock(node: Block) {
  switch (node.type) {
    case 'p':
      return <p>{node.body.map(renderInline)}</p>
    case 'h':
      return <h1>{node.body.map(renderInline)}</h1>
    // ... handle other block types
  }
}

// Render in your wrapper component
return <>{ast.map(renderBlock)}</>
```

Or generate Word documents with [docx](https://github.com/dolanmiu/docx):

```typescript
import { Document, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Packer } from 'docx'
import { writeFileSync } from 'fs'
import { parser } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

const parse = parser()
const ast = parse('# Hello *world*!')

function renderInline(node: Inline): (TextRun | ExternalHyperlink)[] {
  switch (node.type) {
    case '':
      return [new TextRun(node.txt)]
    case 'b':
      return [
        new TextRun({
          text: node.body.map(n => (n.type === '' ? n.txt : '')).join(''),
          bold: true,
        }),
      ]
    case 'i':
      return [
        new TextRun({
          text: node.body.map(n => (n.type === '' ? n.txt : '')).join(''),
          italics: true,
        }),
      ]
    case 'a':
      return [new ExternalHyperlink({ link: node.href, children: node.body.flatMap(renderInline) })]
    default:
      return []
  }
}

function renderBlock(node: Block): Paragraph {
  switch (node.type) {
    case 'p':
      return new Paragraph({ children: node.body.flatMap(renderInline) })
    case 'h':
      return new Paragraph({
        heading: HeadingLevel[`HEADING_${node.level}`],
        children: node.body.flatMap(renderInline),
      })
    default:
      return new Paragraph({})
  }
}

const doc = new Document({ sections: [{ children: ast.map(renderBlock) }] })
Packer.toBuffer(doc).then(buffer => {
  writeFileSync('output.docx', buffer)
})
```

### Extending LiteMarkup

LiteMarkup is designed to be forked and extended. The **[Extension Cookbook](./EXTENDING.md)** has full examples for some common features people might want to add.

---

## Language tour

````litemarkup
# Heading 1

## Heading 2

*This is bold*
_This is italic_
~This is deleted~

In markdown mode: **bold**, _italic_, and ~~deleted~~

1. Ordered list
2. Second item
   - Nested unordered

A [link](https://example.com) in text.

| Feature          | Status |
| ---------------- | ------ |
| Basic formatting | ✅     |
| Tables           | ✅     |
| Simple API       | ✅     |

> A blockquote

`inline code` and:

```javascript
// fenced code block
const x = 42
```

---

Thematic break above. Force line break with backslash:\
New line here.
Use backslash to escape special characters to keep them verbatim:
\*this is not bolded — verbatim asterisks\*

    * Indent anything four spaces to keep entire paragraph verbatim without using backslash escapes. *
````

**[Try it live →](https://tuures.github.io/LiteMarkup/docs/demopage.html)**

Some notable differences from CommonMark and GFM (not a comprehensive list of differences):

- [Emphasis and strong emphasis](https://spec.commonmark.org/0.29/#emphasis-and-strong-emphasis) use single `_` and `*` characters, respectively.
- [Settext headings](https://spec.commonmark.org/0.29/#setext-heading) are not supported (use ATX headings (`# foo`) instead)
- [Indented code blocks](https://spec.commonmark.org/0.29/#indented-code-block) are not supported (use fenced code blocks (```) instead)
- Only U+000A (aka `\n` / LF) is considered [_line ending_](https://spec.commonmark.org/0.29/#line-ending).
- Only space and tab are considered [_whitespace characters_](https://spec.commonmark.org/0.29/#whitespace-character).
- [Tabs have no behaviour](https://spec.commonmark.org/0.29/#example-6).
- [Thematic breaks](https://spec.commonmark.org/0.29/#thematic-break) do not interrupt paragraph (blank line needed).
- ATX headings cannot have [closing sequence](https://spec.commonmark.org/0.29/#example-41).
- [Entity and numeric character references](https://spec.commonmark.org/0.29/#entity-and-numeric-character-references) are not supported
- Only type 7 [HTML blocks](https://spec.commonmark.org/0.29/#html-block) are supported (and with some limitations)
- [Link reference definitions](https://spec.commonmark.org/0.29/#link-reference-definition) are not supported

[Full syntax description →](./docs/LiteMarkup-syntax.lm)

---

### CLI usage

```bash
echo "# Hello" | npx litemarkup
# → <h1>Hello</h1>

# Pass --allow-unsafe-html to allow HTML blocks, links, and images
echo "[click](http://example.com)" | npx litemarkup --allow-unsafe-html
# → <p><a href="http://example.com">click</a></p>
```

---

## Quick browser usage the old-school way

```html
<script src="https://unpkg.com/litemarkup/dist/litemarkup.min.iife.js"></script>
<script>
  const html = litemarkup.convertToHtml('# Hello from the browser!')
  document.body.innerHTML = html
</script>
```

---

## Comparison and performance

LiteMarkup performance is roughly on par with popular JS-based implementations like commonmark, marked, and markdown-it, but naturally slower than WASM-based ones.

If you are looking for a smaller bundle size with reasonable performance, decent feature support, and AST-output, LiteMarkup can be a good option.

| Name          | Min+gzip ([bundlephobia.com](https://bundlephobia.com))         | AST support | Feature Coverage | Performance |
| ------------- | --------------------------------------------------------------- | ----------- | ---------------- | ----------- |
| LiteMarkup    | 🟢🟢 ++ ([2.3 kB](https://bundlephobia.com/package/litemarkup)) | 🟢🟢 ++     | 🟢 +             | 🟢 +        |
| commonmark    | 🔴 - ([47.2 kB](https://bundlephobia.com/package/commonmark))   | 🟢🟢 ++     | 🟢🟢 ++          | 🟢 +        |
| marked        | 🔴 - ([12.0 kB](https://bundlephobia.com/package/marked))       | 🔴🔴 --     | 🟢🟢 ++          | 🟢 +        |
| markdown-it   | 🔴 - ([43.3 kB](https://bundlephobia.com/package/markdown-it))  | 🟢 +        | 🟢🟢 ++          | 🟢 +        |
| micromark     | 🔴 - ([14.2 kB](https://bundlephobia.com/package/micromark))    | 🟢 +        | 🟢🟢 ++          | 🔴🔴 --     |
| snarkdown     | 🟢🟢 ++ ([1.1 kB](https://bundlephobia.com/package/snarkdown))  | 🔴🔴 --     | 🔴 -             | 🔴🔴 --     |
| markdown-wasm | 🟢 + ([4.2 kB](https://bundlephobia.com/package/markdown-wasm)) | 🔴🔴 --     | 🟢🟢 ++          | 🟢🟢 ++     |
| ironmark      | 🔴🔴 -- ([500+ kB](https://bundlephobia.com/package/ironmark))  | 🟢🟢 ++     | 🟢🟢 ++          | 🟢🟢 ++     |

Performance via [markdown-parser-benchmark](https://github.com/tuures/markdown-parser-benchmark)

LiteMarkup `089ee2d` (markdownMode: true, allowUnsafeHtml: true)

```
> node benchmark.js

Input: 10/983 files, 820 KB
Host: darwin x64 | Intel(R) Core(TM) i7-4980HQ CPU @ 2.80GHz
Node: v22.12.0
Config: rounds=5, time=1000ms, warmup=300ms, gcBetweenRounds=false

=== AST/token parsing ===
ironmark (rust/wasm)  avg 100.459 ops/sec  best 107.078  round-RSD 5.88%  samples/round 97.2  total 486  (1.00x)
commonmark            avg  27.764 ops/sec  best  29.193  round-RSD 5.10%  samples/round   64  total 320  (0.28x)
litemarkup            avg  20.427 ops/sec  best  20.856  round-RSD 3.11%  samples/round   64  total 320  (0.20x)
markdown-it           avg  15.028 ops/sec  best   15.44  round-RSD 2.11%  samples/round   64  total 320  (0.15x)

=== Parsing + HTML rendering ===
ironmark (rust/wasm)    avg 91.951 ops/sec  best 93.925  round-RSD 1.79%  samples/round 91.8  total 459  (1.00x)
markdown-wasm (c/wasm)  avg 54.377 ops/sec  best 56.429  round-RSD 4.87%  samples/round   64  total 320  (0.59x)
commonmark              avg 19.856 ops/sec  best 20.739  round-RSD 6.66%  samples/round   64  total 320  (0.22x)
litemarkup (html)       avg 14.967 ops/sec  best 15.182  round-RSD 0.91%  samples/round   64  total 320  (0.16x)
markdown-it             avg 12.929 ops/sec  best 13.337  round-RSD 2.63%  samples/round   64  total 320  (0.14x)
marked                  avg 11.894 ops/sec  best 12.345  round-RSD 3.56%  samples/round   64  total 320  (0.13x)
micromark               avg  1.413 ops/sec  best  1.432  round-RSD 1.25%  samples/round   64  total 320  (0.02x)
snarkdown               avg  1.185 ops/sec  best  1.208  round-RSD 1.50%  samples/round   64  total 320  (0.01x)
```

---

## Contributing

Bugfixes and small enhancements are welcome! However, this project intentionally stays minimal — if you need more features, use [custom AST transformations](#transforming-ast-on-the-fly) and/or a custom renderer to extend functionality outside the core parser. See the [Extension Cookbook](./EXTENDING.md) for examples.

For development setup and guidelines, see [DEV-README.md](./DEV-README.md).

### Developer Certificate of Origin (DCO)

All contributions must be signed off under the [Developer Certificate of Origin](https://developercertificate.org/). By adding a `Signed-off-by` line to your commit messages, you certify that you wrote or have the right to submit the code under this project's MIT license.

---

## AI usage

Written by hand, with AI assisting since 2026. AI has been used particularly for test maintenance, docs, and code review. All AI-assisted work is reviewed before commit.

---

## License

MIT © [tuures](https://github.com/tuures)
