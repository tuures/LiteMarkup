# Changelog

## v1.1.0

- **Fix ordered list split on digit-width change** — ordered list items with different digit widths (e.g. `9. a` followed by `10. b`) now correctly stay in one list. Unordered list items also allow varying 1–3 spaces after the marker without splitting.

- **Require non-space-adjacent emphasis delimiters** — bold, italic, and strikethrough delimiters must hug non-space content (no space after opening or before closing delimiter), to avoid false positives like `~10 minutes in ~200 degrees` while still allowing intraword emphasis (for example `work_s_`, `with_in_s`).

- **Optimize paragraph block parsing** — Consume characters up to the next newline faster.

## v1.0.1

- **Fix table parsing at EOF** — fixed a parser bug where table parsing could fail when the input ended immediately after the delimiter row or last table row (no trailing newline)

## v1.0.0

### Breaking changes

**Redesigned API** — the library now uses a factory-function pattern. Functions are renamed and take option objects:

| v0.1.x                           | v1.0.0                         |
| -------------------------------- | ------------------------------ |
| `parseToAst(src, markdownMode?)` | `parser(options?)(src)`        |
| `astToHtml(ast)`                 | `htmlRenderer(options?)(ast)`  |
| `convertToHtml(src)`             | `convertToHtml(src, options?)` |

Before:

```ts
import { parseToAst, astToHtml, convertToHtml } from 'litemarkup'

const ast = parseToAst('# Hello', true) // markdownMode as 2nd arg
const html = astToHtml(ast)

// OR

convertToHtml('# Hello')
```

After:

```ts
import { parser, htmlRenderer, convertToHtml } from 'litemarkup'

const parse = parser({ markdownMode: true })
const render = htmlRenderer({ allowUnsafeHtml: true })

const ast = parse('# Hello')
const html = render(ast)

// OR

convertToHtml('# Hello', { markdownMode: true, allowUnsafeHtml: true })
```

**AST node discriminant renamed: `name` → `type`** — every AST node's discriminant field has been renamed from `name` to `type`. Update all code that reads or constructs AST nodes.

Before:

```ts
if (node.name === 'p') { ... }
switch (node.name) { case 'h': ... }
const text = { name: '', txt: 'hello' }
```

After:

```ts
if (node.type === 'p') { ... }
switch (node.type) { case 'h': ... }
const text = { type: '', txt: 'hello' }
```

**HTML output no longer uses inline styles** — bold and italic previously rendered as `<span style="font-weight: bold;">` and `<span style="font-style: italic;">`. They now render as `<b>` and `<i>` elements. If you relied on the old inline-style output, update your CSS.

**Raw HTML, links, and images are textified by default** — the HTML renderer now converts these to safe text unless `allowUnsafeHtml: true` is passed. Previously all content was rendered as-is with no sanitization.

**Blockquotes require `>` on every line** — lazy continuation (omitting `>` on continuation lines) is no longer supported.

**ESM only** — the package now sets `"type": "module"` and only ships `.mjs` files. CommonJS `require()` may still work on recent Node versions but is not officially supported. If you need CJS, use a dynamic `import()`.

**CLI no longer appends trailing newline** — output is written with `process.stdout.write()` instead of `console.log()`.

### New features

- **AST transform hooks** — `parser({ transformBlock, transformInline })` lets you modify nodes during parsing without forking the parser or writing a separate walker
- **`allowUnsafeHtml` option** — opt-in to render raw HTML blocks, links, and images via `htmlRenderer({ allowUnsafeHtml: true })` or `convertToHtml(src, { allowUnsafeHtml: true })`
- **Built-in strikethrough** — use `~deleted~` in LiteMarkup mode or `~~deleted~~` in markdown mode; renders to the inline AST node `type: 's'` and HTML `<del>...</del>`
- **Separate imports** — import only the parser or renderer to reduce bundle size:
  ```ts
  import { parser } from 'litemarkup/parser'
  import { htmlRenderer } from 'litemarkup/html'
  import type { Block, Inline } from 'litemarkup/ast'
  ```
- **Angle-bracket URL syntax** — `[text]<url>` works alongside `[text](url)`
- **Images in links** — `[![alt](img-src)](link-href)` is now supported
- **CLI flags** — `--allow-unsafe-html` and `--markdown-mode`
- **Tables** — GFM-style pipe tables with header row, delimiter row, and optional body rows. AST node type `tbl` with `rows: Inline[][][]`. Supports inline formatting in cells and escaped pipes.

### Bug fixes

- HTML entity escaping was applied only to the first occurrence of each character — fixed to escape all occurrences
- Code blocks with empty content rendered incorrectly — fixed
- HTML block parsing is more strict to avoid false positives
- Parser now merges consecutive text nodes, producing cleaner ASTs
- CLI reads stdin via callback instead of `readFileSync`, with proper error handling

### Internal

- Build system migrated from Parcel to tsdown
- ESM package with `"type": "module"` and proper `exports` map
- Dependencies updated (TypeScript 5.9, Jest 30)
- Source files renamed: `parseToAst.ts` → `parser.ts`, `astToHtml.ts` → `html.ts`

### Upgrading from v0.1.x — quick checklist

1. **Find-and-replace function calls:**
   - `parseToAst(` → `parser()(` (or create the parser once and reuse for better performance)
   - `astToHtml(` → `htmlRenderer()(` (or create the renderer once and reuse for better performance)
2. **Find-and-replace AST field (custom renderers / AST transformers):** `.name` → `.type` and `name:` → `type:` in all AST construction/access
3. **If you pass `markdownMode`:** move it from `parseToAst(src, true)` to `parser({ markdownMode: true })`
4. **If you render user-supplied content:** the default is now safe (HTML/links/images textified). Add `allowUnsafeHtml: true` only if you sanitize input yourself
5. **If you match HTML output in tests:** update expected output from `<span style="font-weight: bold;">` / `<span style="font-style: italic;">` to `<b>` / `<i>`
6. **If you use blockquotes:** ensure every continuation line starts with `>`
7. **Update imports** if you used deep paths — the subpath exports are now `litemarkup/parser`, `litemarkup/html`, `litemarkup/ast`
8. **If you use CommonJS `require()`:** the package is now ESM-only. Switch to `import` or use dynamic `import()`
