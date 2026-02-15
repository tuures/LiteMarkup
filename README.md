<div align="center">

# 🪶 LiteMarkup

**A tiny, fast Markdown(-like) parser for when you need just the essentials. Not tied to HTML output.**

[![npm version](https://img.shields.io/npm/v/litemarkup.svg)](https://www.npmjs.com/package/litemarkup)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/litemarkup)](https://bundlephobia.com/package/litemarkup)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Live Playground](https://tuures.github.io/LiteMarkup/demopage/demopage.html) · [API Docs](#api) · [Why LiteMarkup?](#why-litemarkup)

</div>

---

## Why LiteMarkup?

Most Markdown parsers are **bloated** — full CommonMark implementations have edge cases you'll never use. LiteMarkup is different:

- ✅ **Tiny & fast** — less than 3 KB gzipped, zero dependencies, fast parsing
- ✅ **AST-first** — Parse once, render to anything (HTML, React, JSON, plain text...) with ease
- ✅ **TypeScript** — Full type safety for AST out of the box
- ✅ **Simple API** — No complex config, no plugins, no learning curve

**Perfect for:** Comment systems, chat apps, note-taking tools, or anywhere you want lightweight markup without the bloat.

> 💡 **AST-first design:** Unlike libraries that only output HTML, LiteMarkup gives you a clean typed AST. Build custom renderers easily.

---

## Quick start

```bash
npm install litemarkup
```

```typescript
import { parseToAst, astToHtml } from 'litemarkup'

// Create a parser (optionally with transforms)
const parse = parseToAst()

const ast = parse('# Hello *world*!')
// → [{ name: 'h', level: 1, body: [
//      { name: '', txt: 'Hello ' },
//      { name: 'b', body: [{ name: '', txt: 'world' }] },
//      { name: '', txt: '!' }
//    ]}]

// Built-in HTML renderer
const html = astToHtml(ast)
// → <h1>Hello <b>world</b>!</h1>

// Or build your own renderer: React, DOCX, PDF, ...
// See examples below
```

**That's it.** No complex config, no plugins, no 50KB bundle.

> ⚠️ **Security note:** `astToHtml` assumes input can be trusted — it renders the AST as-is.
> If your input is untrusted you need to [sanitize the input](#sanitizing-untrusted-input) first.
> For convenience, a built-in shorthand `convertToHtml` is provided that includes AST transforms to textify HTML blocks, links, and images.

```typescript
import { convertToHtml } from 'litemarkup'

// Links and images are converted to text
convertToHtml('Click [here](/url)!')
// → '<p>Click here (/url)!</p>'

// HTML blocks are converted to paragraphs (which escape content automatically)
convertToHtml('<script>\nalert(1)\n</script>\n\n')
// → '<p>&lt;script&gt;\nalert(1)\n&lt;/script&gt;</p>'
```

---

## Syntax overview

- ✅ **Headings** — `# H1` through `###### H6`
- ✅ **Bold & Italic** — `*bold*` and `_italic_` (or use [markdown mode](#markdown-compatibility-mode) for `**bold**` / `*italic*`)
- ✅ **Lists** — Ordered (`1.`) and unordered (`*`)
- ✅ **Links** — `[text]<url>` or `[text](url)`
- ✅ **Code** — Inline `` `code` `` and fenced blocks
- ✅ **Blockquotes** — `> quoted text`
- ✅ **Thematic breaks** — `---`
- ✅ **Escape characters** — `\*not bold\*`
- ✅ **Line breaks** — Trailing `\`

[See language tour](#language-tour)

---

## API

### Basic usage

```typescript
import { parseToAst, astToHtml } from 'litemarkup'

// Create a parser (optionally with transforms)
const parse = parseToAst()

// Get the AST for custom processing
const ast = parse('Hello *world*!')
// → [{ name: 'p', body: [
//      { name: '', txt: 'Hello ' },
//      { name: 'b', body: [{ name: '', txt: 'world' }] },
//      { name: '', txt: '!' }
//    ]}]

// Then render to HTML
const html = astToHtml(ast)
```

### Markdown compatibility mode

By default, LiteMarkup uses `*bold*` and `_italic_`. Enable markdown mode for CommonMark-style emphasis:

```typescript
import { parseToAst, astToHtml } from 'litemarkup'

const parse = parseToAst({ markdownMode: true })

const ast = parse('Hello **world** and *italic*!')
const html = astToHtml(ast)
// → '<p>Hello <b>world</b> and <i>italic</i>!</p>'
```

### Transforming AST on-the-fly

Use `transformBlock` and `transformInline` hooks to modify the AST during parsing:

```typescript
import { parseToAst, astToHtml } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

// Example 1: Convert all headings to level 2
const parse = parseToAst({
  transformBlock: (node: Block): Block[] => {
    if (node.name === 'h') {
      return [{ ...node, level: 2 }]
    }
    return [node]
  }
})

// Example 2: Auto-link URLs in text
const parseWithAutoLinks = parseToAst({
  transformInline: (node: Inline): Inline[] => {
    if (node.name === '' && node.txt.includes('http')) {
      const match = node.txt.match(/(https?:\/\/[^\s]+)/)
      if (match) {
        const url = match[1]
        const idx = node.txt.indexOf(url)
        return [
          { name: '', txt: node.txt.slice(0, idx) },
          { name: 'a', href: url, body: [{ name: '', txt: url }] },
          { name: '', txt: node.txt.slice(idx + url.length) }
        ]
      }
    }
    return [node]
  }
})

// Example 3: Remove a node by returning empty array
const parseNoImages = parseToAst({
  transformInline: (node: Inline): Inline[] =>
    node.name === 'img' ? [] : [node]
})
```

### Sanitizing untrusted input

Strip or modify dangerous content using transforms. For example:

```typescript
import { parseToAst, astToHtml } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

const isSafeUrl = (url: string) => /^https?:\/\//.test(url)

const parse = parseToAst({
  transformBlock: (node: Block): Block[] => {
    // Drop HTML blocks
    if (node.name === 'htm') {
      return []
    }
    return [node]
  },
  transformInline: (node: Inline): Inline[] => {
    // Remove links with unsafe URLs, keep the text
    if (node.name === 'a' && !isSafeUrl(node.href)) {
      return node.body
    }
    // Remove images with unsafe URLs entirely
    if (node.name === 'img' && !isSafeUrl(node.src)) {
      return []
    }
    return [node]
  }
})

astToHtml(parse('[safe](https://example.com) and [danger](javascript:void)'))
// → '<p><a href="https://example.com">safe</a> and danger</p>'
```

### Custom renderers

The AST makes it easy to render to anything — not just HTML.
For example, render directly into React components:

```tsx
import { parseToAst } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

const parse = parseToAst()
const ast = parse('Hello *world*!')

// e.g. create a custom render that outputs React elements
function renderInline(node: Inline) {
  switch (node.name) {
    case '': return node.txt
    case 'a': return <a href={node.href}>{node.body.map(renderInline)}</a>
    // ... handle other inline types
  }
}

function renderBlock(node: Block) {
  switch (node.name) {
    case 'p': return <p>{node.body.map(renderInline)}</p>
    case 'h': return <h1>{node.body.map(renderInline)}</h1>
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
import { parseToAst } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'

const parse = parseToAst()
const ast = parse('# Hello *world*!')

function renderInline(node: Inline): (TextRun | ExternalHyperlink)[] {
  switch (node.name) {
    case '': return [new TextRun(node.txt)]
    case 'b': return [new TextRun({ text: node.body.map(n => n.name === '' ? n.txt : '').join(''), bold: true })]
    case 'i': return [new TextRun({ text: node.body.map(n => n.name === '' ? n.txt : '').join(''), italics: true })]
    case 'a': return [new ExternalHyperlink({ link: node.href, children: node.body.flatMap(renderInline) })]
    default: return []
  }
}

function renderBlock(node: Block): Paragraph {
  switch (node.name) {
    case 'p': return new Paragraph({ children: node.body.flatMap(renderInline) })
    case 'h': return new Paragraph({ heading: HeadingLevel[`HEADING_${node.level}`], children: node.body.flatMap(renderInline) })
    default: return new Paragraph({})
  }
}

const doc = new Document({ sections: [{ children: ast.map(renderBlock) }] })
Packer.toBuffer(doc).then(buffer => {
  writeFileSync('output.docx', buffer)
})

```

---

## Language tour

````markdown
# Heading 1
## Heading 2

*This is bold*
_This is italic_

In markdown mode: **bold** and *italic*

1. Ordered list
2. Second item
   * Nested unordered

A [link](https://example.com) in text.

> A blockquote

`inline code` and:

```javascript
// fenced code block
const x = 42
```

---

Thematic break above. Force line break with backslash:\
New line here.
````

**[Try it live →](https://tuures.github.io/LiteMarkup/demopage/demopage.html)**

Notable differences from CommonMark:

- [Emphasis and strong emphasis](https://spec.commonmark.org/0.29/#emphasis-and-strong-emphasis) use single `_` and `*` characters, respectively.
- [Settext headings](https://spec.commonmark.org/0.29/#setext-heading) are not supported (use ATX headings (`# foo`) instead)
- [Indented code blocks](https://spec.commonmark.org/0.29/#indented-code-block) are not supported (use fenced code blocks (```) instead)
- Only U+000A (aka `\n` / LF) is considered [*line ending*](https://spec.commonmark.org/0.29/#line-ending).
- Only space and tab are considered [*whitespace characters*](https://spec.commonmark.org/0.29/#whitespace-character).
- [Tabs have no behaviour](https://spec.commonmark.org/0.29/#example-6).
- [Thematic breaks](https://spec.commonmark.org/0.29/#thematic-break) do not interrupt paragraph (blank line needed).
- ATX headings cannot have [closing sequence](https://spec.commonmark.org/0.29/#example-41).
- [Entity and numeric character references](https://spec.commonmark.org/0.29/#entity-and-numeric-character-references) are not supported
- Only type 7 [HTML blocks](https://spec.commonmark.org/0.29/#html-block) are supported (and with some limitations)
- [Link reference definitions](https://spec.commonmark.org/0.29/#link-reference-definition) are not supported

[Full syntax description →](./LiteMarkup-syntax.lm)

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

## Contributing

Bugfixes and small enhancements are welcome! This project intentionally stays minimal — if you need more features, consider forking or using [custom AST transformations](#transforming-ast-on-the-fly) to extend functionality outside the core parser.

```bash
git clone https://github.com/tuures/LiteMarkup.git
cd LiteMarkup
npm install
npm test
npm run build
```

---

## License

MIT © [tuures](https://github.com/tuures)
