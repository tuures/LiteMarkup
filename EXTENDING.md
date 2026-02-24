# Extending LiteMarkup — cookbook & guide

This guide shows how to extend LiteMarkup with custom syntax, custom AST nodes, and custom renderers. It is self-contained; **AGENTS.md** contains the short rules for AI agents, and this file contains the full cookbook.

> **Key rule:** All custom AST nodes must use `type: 'x'` plus a subtype key `x` (e.g., `x: 'alert'`). This keeps extensions compatible across different authors without editing core types.

## AST quick reference

Core nodes use short `type` tags. Key field names:

### Block nodes

| Node           | `type`  | Key fields                         |
| -------------- | ------- | ---------------------------------- |
| Paragraph      | `'p'`   | `body: Inline[]`                   |
| Heading        | `'h'`   | `level`, `body: Inline[]`          |
| Table          | `'tbl'` | `rows: Inline[][][]`               |
| Code block     | `'cb'`  | `txt`, `infoText`                  |
| HTML block     | `'htm'` | `raw`                              |
| Thematic break | `'hr'`  | —                                  |
| Blockquote     | `'bq'`  | `doc: Block[]`                     |
| List           | `'l'`   | `startNumber`, `items: ListItem[]` |
| List item      | `'li'`  | `doc: Block[]`                     |

### Inline nodes

| Node       | `type`  | Key fields           |
| ---------- | ------- | -------------------- |
| Text       | `''`    | `txt`                |
| Code span  | `'cs'`  | `txt`                |
| Hard break | `'br'`  | —                    |
| Italic     | `'i'`   | `body: Inline[]`     |
| Bold       | `'b'`   | `body: Inline[]`     |
| Link       | `'a'`   | `body: Inline[]`, `href` |
| Image      | `'img'` | `alt`, `src`         |

## Extension nodes

`type: 'x'`, `x: 'your-subtype'`, plus whatever fields you need.

---

## Table of contents

- [Extension architecture patterns](#extension-architecture-patterns)
- [Writing a custom renderer](#writing-a-custom-renderer)
- [GFM-style alerts (callouts)](#gfm-style-alerts-callouts)
- [Task lists / checkboxes](#task-lists--checkboxes)
- [Strikethrough](#strikethrough)
- [Highlighted / marked text](#highlighted--marked-text)
- [Emoji shortcodes](#emoji-shortcodes)
- [Automatic URL linking](#automatic-url-linking)
- [Table of contents generation](#table-of-contents-generation)
- [Footnotes](#footnotes)
- [Custom containers / admonitions](#custom-containers--admonitions)

---

## Extension architecture patterns

Transformer signatures (parser options):

- `transformBlock?: (node: Block) => Block[]`
- `transformInline?: (node: Inline) => Inline[]`

Both hooks receive a **single node** and return an array — return `[node]` to keep it, `[]` to remove it, or a new array to replace it.

### Preferred order

1. **Transform hooks** (AST transformers via parser options)
2. **Custom renderer**
3. **Combination of transform + renderer** (custom nodes or extra attributes on core nodes)
4. **Custom parser fork** (last resort)

### Transformers vs walkers

- **Transformer (preferred):** single pass that both visits and transforms nodes. Avoid a separate generic walker if a transformer can handle the work in one pass.
- **Custom walker:** only when you truly need a reusable traversal separate from the transform.

### Pattern 1: AST transformer (recommended)

```
Input → core parse() + your transformer → modified AST (only built-in nodes) → render()
```

### Pattern 2: Custom renderer

```
Input → core parse() → AST → your custom render()
```

### Pattern 3: Combination of transform + renderer

```
Input → core parse() + your transformer → AST with your customized nodes → your custom render()
```

### Pattern 4. Custom parser fork

```
Input → your parse() → AST with your customized nodes → your custom render()
```

### Custom AST node tagging

- Subtype core node types by adding `x: 'something'` to indicate the extension subtype.
- For completely new node types use `type: 'x'` and subtype `x: 'something'`

```ts
// ✅ CORRECT — custom node types
{ type: 'bq', x: 'alert', level: 'warning', doc: [...] }
{ type: 'li', x: 'task-item', checked: true, doc: [...] }  // core renderers see it as normal li
{ type: 'x', x: 'math', formula: 'x^2' }

// ❌ WRONG — collides with core namespace or missing subtype
{ type: 'a' }
{ type: 'x-task-item' }
{ type: 'x' } // no subtype field
```

### Combining multiple transformations

Chain multiple transformations with flatMap — order can matter:

```ts
import { parser } from 'litemarkup/parser'

const parse = parser({
  transformBlock: (node) => {
    return transformAlert(node).flatMap(transformTaskList)
  },
  transformInline: (node) => {
    return expandStrikethrough(node).flatMap(expandAutolink)
  },
})
```

---

## Writing a custom renderer

Pattern: write a `renderBlocks(blocks: Block[]): string` entry point that maps over the array, and a `renderInlines(inlines: Inline[]): string` that does the same. Each delegates to a switch on `node.type`.

Example: render AST to plain terminal text with ANSI colors.

```ts
import type { Block, Inline } from 'litemarkup/ast'

function renderBlocks(blocks: Block[]): string {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'x':
          // handle your extensions by switching on block.x
          return ''
        case 'h':
          return `\x1b[1m${'#'.repeat(block.level)} ${renderInlines(block.body)}\x1b[0m`
        case 'p':
          return renderInlines(block.body)
        case 'cb':
          return `\x1b[90m${block.txt}\x1b[0m`
        case 'bq':
          return renderBlocks(block.doc)
            .split('\n')
            .map(l => `> ${l}`)
            .join('\n')
        case 'hr':
          return '---'
        case 'htm':
          return block.raw
        case 'tbl': {
          // Render all cells first, then pad to align columns.
          // Note: ANSI escapes in cells would throw off .length — strip them for production use.
          const cells = block.rows.map(row => row.map(cell => renderInlines(cell)))
          const widths = cells[0].map((_, c) =>
            Math.max(...cells.map(row => (row[c] ?? '').length)),
          )
          return cells
            .map(row => '| ' + row.map((s, c) => s.padEnd(widths[c])).join(' | ') + ' |')
            .join('\n')
        }
        case 'l':
          return block.items
            .map(
              (item, i) =>
                `${block.startNumber ? `${block.startNumber + i}.` : '-'} ${renderBlocks(item.doc)}`,
            )
            .join('\n')
        default:
          return ''
      }
    })
    .join('\n\n')
}

function renderInlines(inlines: Inline[]): string {
  return inlines
    .map(node => {
      switch (node.type) {
        case 'x':
          // handle inline extensions by switching on node.x
          return ''
        case '':
          return node.txt
        case 'b':
          return `\x1b[1m${renderInlines(node.body)}\x1b[0m`
        case 'i':
          return `\x1b[3m${renderInlines(node.body)}\x1b[0m`
        case 'cs':
          return `\x1b[90m${node.txt}\x1b[0m`
        case 'a':
          return `${renderInlines(node.body)} (${node.href})`
        case 'img':
          return `[${node.alt}]`
        case 'br':
          return '\n'
        default:
          return ''
      }
    })
    .join('')
}
```

---

## GFM-style callouts

GitHub-flavored callouts are blockquotes whose first line is `[!NOTE]`, `[!WARNING]`, etc.

**Strategy:** `transformBlock` hook — when the node is a blockquote matching the pattern, return a node with `x: 'alert'` attribute.

```ts
import { parser } from 'litemarkup/parser'
import type { Block, Inline, Paragraph } from 'litemarkup/ast'

interface XCalloutBlock {
  type: 'bq'
  x: 'alert'
  level: 'note' | 'tip' | 'important' | 'warning' | 'caution'
  body: Block[]
}

const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i

function transformCallouts(node: Block): (Block | XCalloutBlock)[] {
  if (node.type !== 'bq') return [node]

  const first = node.doc[0]
  if (!first || first.type !== 'p') return [node]

  const firstInline = first.body[0]
  if (!firstInline || firstInline.type !== '') return [node]

  const match = firstInline.txt.match(ALERT_RE)
  if (!match) return [node]

  const level = match[1].toLowerCase() as XCalloutBlock['level']
  const remaining = firstInline.txt.slice(match[0].length)

  const newFirst: Paragraph = {
    ...first,
    body: remaining
      ? [{ ...firstInline, txt: remaining }, ...first.body.slice(1)]
      : first.body.slice(1),
  }

  return [
    {
      type: 'x' as const,
      x: 'callout' as const,
      level,
      body: [newFirst, ...node.doc.slice(1)],
    },
  ]
}

const parse = parser({ transformBlock: transformAlert })
```

Renderer — add a case to your `renderBlocks`:

```ts
function renderBlocks(blocks: (Block | XCalloutBlock)[]): string {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'x':
          switch (block.x) {
            case 'callout': {
              const title = block.level.charAt(0).toUpperCase() + block.level.slice(1)
              return `<div class="callout callout-${block.level}">\n<p class="callout-title">${title}</p>\n${renderBlocks(block.body)}\n</div>`
            }
            default:
              return ''
          }
        // ... other block types
      }
    })
    .join('\n')
}
```

**Usage:**

```markdown
> [!NOTE]
> This is a note.

> [!WARNING]
> This is a warning with _bold_ text.
```

---

## Task lists / checkboxes

Task lists are list items starting with `[ ]` or `[x]`.

**Strategy:** `transformBlock` hook on list nodes — rewrite matching list items to `x`/`task-item` nodes.

```ts
import type { Block, Inline, Paragraph } from 'litemarkup/ast'

interface XTaskItem {
  type: 'li'
  x: 'task-item'
  checked: boolean
  doc: Block[]
}

function transformTaskList(node: Block): Block[] {
  if (node.type !== 'l') return [node]

  const newItems = node.items.map(item => {
    const first = item.doc[0]
    if (!first || first.type !== 'p') return item

    const text = first.body[0]
    if (!text || text.type !== '') return item

    const checkMatch = text.txt.match(/^\[([ xX])\]\s*/)
    if (!checkMatch) return item

    const checked = checkMatch[1].toLowerCase() === 'x'
    const remaining = text.txt.slice(checkMatch[0].length)

    return {
      type: 'li' as const,
      x: 'task-item' as const,
      checked,
      doc: [
        {
          ...first,
          body: remaining
            ? [{ ...text, txt: remaining }, ...first.body.slice(1)]
            : first.body.slice(1),
        },
        ...item.doc.slice(1),
      ],
    }
  })

  return [{ ...node, items: newItems }]
}
```

Renderer — handle `x`/`task-item` in the list-item rendering path of your `renderBlocks`:

```ts
function renderBlocks(blocks: Block[]): string {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'l':
          return block.items
            .map((item, i) => {
              if (item.x === 'task-item') {
                const check = item.checked ? '☑' : '☐'
                return `${check} ${renderBlocks(item.doc)}`
              }
              const bullet = block.startNumber ? `${block.startNumber + i}.` : '-'
              return `${bullet} ${renderBlocks(item.doc)}`
            })
            .join('\n')
        // ... other block types
      }
    })
    .join('\n\n')
}
```

**Usage:**

```markdown
- [x] Completed task
- [ ] Incomplete task
- Regular list item
```

---

## Strikethrough

Wrap text in `~~deleted~~` to produce `<del>deleted</del>`.

**Strategy:** `transformInline` hook — split text nodes containing `~~...~~` into text and `x`/`strikethrough` nodes.

```ts
import type { Inline } from 'litemarkup/ast'

interface XStrikethrough {
  type: 'x'
  x: 'strikethrough'
  body: Inline[]
}

const STRIKE_RE = /~~(.+?)~~/g

function expandStrikethrough(node: Inline): (Inline | XStrikethrough)[] {
  if (node.type !== '') return [node]

  const parts: (Inline | XStrikethrough)[] = []
  let last = 0

  for (const m of node.txt.matchAll(STRIKE_RE)) {
    if (m.index! > last) {
      parts.push({ type: '', txt: node.txt.slice(last, m.index!) })
    }
    parts.push({
      type: 'x',
      x: 'strikethrough',
      body: [{ type: '', txt: m[1] }],
    })
    last = m.index! + m[0].length
  }

  if (last === 0) return [node]
  if (last < node.txt.length) {
    parts.push({ type: '', txt: node.txt.slice(last) })
  }
  return parts
}

const parse = parser({ transformInline: expandStrikethrough })
```

Renderer — add to your `renderInlines`:

```ts
function renderInlines(inlines: (Inline | XStrikethrough)[]): string {
  return inlines
    .map(node => {
      switch (node.type) {
        case 'x': {
          if (node.x === 'strikethrough')
            return `<del>${renderInlines(node.body)}</del>`
          return ''
        }
        // ... other inline types
      }
    })
    .join('')
}
```

---

## Highlighted / marked text

Wrap text in `==highlighted==` to produce `<mark>highlighted</mark>`.

Same pattern as strikethrough, using `==...==` instead of `~~...~~`:

```ts
import type { Inline } from 'litemarkup/ast'

interface XMark {
  type: 'x'
  x: 'mark'
  body: Inline[]
}

const MARK_RE = /==(.+?)==/g

function expandMark(node: Inline): (Inline | XMark)[] {
  if (node.type !== '') return [node]

  const parts: (Inline | XMark)[] = []
  let last = 0

  for (const m of node.txt.matchAll(MARK_RE)) {
    if (m.index! > last) {
      parts.push({ type: '', txt: node.txt.slice(last, m.index!) })
    }
    parts.push({
      type: 'x',
      x: 'mark',
      body: [{ type: '', txt: m[1] }],
    })
    last = m.index! + m[0].length
  }

  if (last === 0) return [node]
  if (last < node.txt.length) {
    parts.push({ type: '', txt: node.txt.slice(last) })
  }
  return parts
}
```

Renderer: `<mark>${renderInlines(node.body)}</mark>`

---

## Emoji shortcodes

Simplest approach: render-time replacement inside text nodes (no AST transform needed).

```ts
const EMOJI_MAP: Record<string, string> = {
  rocket: '🚀',
  fire: '🔥',
  star: '⭐',
  check: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  heart: '❤️',
  thumbsup: '👍',
}

const EMOJI_RE = /:([a-z0-9_+-]+):/g
```

In your `renderInlines`, replace emoji codes when rendering text nodes:

```ts
function renderInlines(inlines: Inline[]): string {
  return inlines
    .map(node => {
      switch (node.type) {
        case '':
          return node.txt.replace(EMOJI_RE, (_, code) => EMOJI_MAP[code] ?? `:${code}:`)
        // ... other inline types
      }
    })
    .join('')
}
```

Pros: no AST transform needed. Cons: renderer must own the replacement logic.

---

## Automatic URL linking

LiteMarkup already supports angle-bracket URLs (`[text]<url>`). For bare URL auto-linking without brackets, use a `transformInline` hook:

```ts
import type { Inline } from 'litemarkup/ast'

const URL_RE = /https?:\/\/[^\s<>\[\])(]+/g

function expandAutolink(node: Inline): Inline[] {
  if (node.type !== '') return [node]

  const parts: Inline[] = []
  let last = 0

  for (const m of node.txt.matchAll(URL_RE)) {
    if (m.index! > last) {
      parts.push({ type: '', txt: node.txt.slice(last, m.index!) })
    }
    // Reuse the core link node type — no custom x node needed
    parts.push({ type: 'a', href: m[0], body: [{ type: '', txt: m[0] }] })
    last = m.index! + m[0].length
  }

  if (last === 0) return [node]
  if (last < node.txt.length) {
    parts.push({ type: '', txt: node.txt.slice(last) })
  }
  return parts
}

const parse = parser({ transformInline: expandAutolink })
```

Note: this example reuses the core `a` link node instead of a custom `x` node, since the output is a standard link — no custom renderer needed.

---

## Table of contents generation

Walk the AST after parsing, collect all heading nodes, generate a nested list:

```ts
import type { Block, Inline } from 'litemarkup/ast'

function generateToc(ast: Block[]): string[] {
  return ast
    .filter((b): b is Extract<Block, { type: 'h' }> => b.type === 'h')
    .map(h => `${'  '.repeat(h.level - 1)}- ${inlinesToText(h.body)}`)
}

function inlinesToText(inlines: Inline[]): string {
  return inlines
    .map(n => {
      switch (n.type) {
        case '':
          return n.txt
        case 'b':
        case 'i':
          return inlinesToText(n.body)
        case 'a':
          return inlinesToText(n.body)
        // ... other inline types
        default:
          return ''
      }
    })
    .join('')
}
```

---

## Scope note

This file is for extension authors (library users). Core-maintenance notes live in **DEV-README.md**.
