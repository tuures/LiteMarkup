# AGENTS.md — AI agent guide for LiteMarkup

This file helps AI coding agents (Codex, Copilot, Cursor, Claude, etc.) understand the LiteMarkup codebase and its extension conventions. Read this before making changes.

## Project overview

LiteMarkup is a lightweight Markdown parser and HTML renderer. It is designed to be forked and extended by library users who want custom syntax, custom AST node types, and custom renderers.

- **Parser** — converts Markdown text → AST (array of block nodes, each containing inline nodes)
- **Renderer** — converts AST → HTML string
- **Parser and renderer can be imported independently**

## Repository layout

```
src/
  ast.ts          — AST node type definitions
  parser.ts       — Markdown → AST parser (block-level + inline-level parsing) reference implementation
  html.ts         — AST → HTML renderer reference implementation
  litemarkup.ts   — facade: re-exports parser, renderer, convertToHtml, AST types
  cli.ts          — CLI entry point
```

Package exports: `litemarkup`, `litemarkup/parser`, `litemarkup/html`, `litemarkup/ast`.

## Commands

- `npm test` — run tests
- `npm run build` — generate dist files

## Architecture principles

1. The AST is a plain JSON-serializable data structure. No classes, no functions, no circular references.
2. The parser is stateless — it takes a string in and returns an AST out.
3. The renderer is stateless — it takes an AST in and returns a string out.
4. Parser and renderer have no shared mutable state or singletons.

## AST node shapes

Core nodes use short `type` tags: `''` (text), `a`, `b`, `bq`, `br`, `cb`, `cs`, `h`, `hr`, `htm`, `i`, `img`, `l`, `li`, `p`, `s`, `tbl`.

Field conventions:

- `body` — inline children (on `p`, `h`, `i`, `b`, `s`, `a`)
- `doc` — nested block children (on `bq`, `li`)
- `txt` — text content (on text `''`, `cs`, `cb`)
- `raw` — raw HTML (on `htm`)

---

## Extension best practices (for extension authors)

For detailed extension examples, see **EXTENDING.md**.

### Transformer hooks (parser options)

- `transformBlock?: (node: Ast.Block) => Ast.Block[]`
- `transformInline?: (node: Ast.Inline) => Ast.Inline[]`

Both are optional, applied via `parser({ transformBlock, transformInline })`. Use them before considering a parser fork.

### Custom AST node tagging

- Subtype core node types by adding `x: 'something'` to indicate the extension subtype.
- For completely new node types use `type: 'x'` and subtype `x: 'something'`

```ts
// ✅ CORRECT — custom node types
{ type: 'bq', x: 'alert', level: 'warning', doc: [...] }
{ type: 'li', x: 'task-item', checked: true, doc: [...] }
{ type: 'x', x: 'math', formula: 'x^2' }

// ❌ WRONG — collides with core namespace or missing subtype
{ type: 'a' }
{ type: 'x-task-item' }
{ type: 'x' } // no subtype field
```

**Why:**

- Core node type tags are reserved.
- `type === 'x'` keeps dispatch stable: `case 'x': switch (node.x) { ... }`.
- Renderers can skip unsupported extension nodes via unknown `x` values.
- Core `ast.ts` does NOT get edited for extensions.

### Renderers should skip unknown extension subtypes gracefully

```ts
function renderBlock(node: Block | XAlertBlock): string {
  switch (node.type) {
    case 'x':
      switch (node.x) {
        case 'alert':
          return renderAlert(node)
        default:
          return '' // skip unknown extension subtype
      }
    // ... handle core nodes ...
    default:
      return defaultRenderBlock(node)
  }
}
```

### Preferred extension patterns (in order)

1. **Transform hooks** (AST transformers via parser options)
2. **Custom renderer**
3. **Combination of transform + renderer** (custom nodes or extra attributes on core nodes)
4. **Custom parser fork** (last resort)

Avoid a separate AST walker step after parsing if the transformer can handle the work in one pass.

### Keep AST nodes serializable

Custom AST nodes must be plain objects. They must survive `JSON.parse(JSON.stringify(node))`.

### Custom node shape conventions

- Use `doc` and `body` for child content (blocks or inlines) where applicable.
- Always include `type: 'x'` as the first property for extensions, plus subtype key `x`.
- Use specific property names (not `data` or `value`).

### Testing extensions

- Run the core test suite after extending
- Add tests for your custom nodes
- Ensure renderer skips unknown extension subtypes

---

## Core maintenance notes (for core contributors)

See **DEV-README.md**. Additional important pointers for AI (CRITICAL):

- Keep parser and renderer stateless and side-effect free.
- Do not introduce runtime dependencies or classes.
- Remember to update also all documentation:
  - README.md
  - DEV-README.md
  - AGENTS.md (this file)
  - EXTENDING.md
  - CHANGELOG.md
  - the [demo website](docs/demopage.html)
  - the [syntax reference](docs/LiteMarkup-syntax.lm) document
- Always verify that all the embedded code examples and example markup is up-to-date in all of the files.

---

## Common tasks for AI agents

### "Add a new syntax feature"

1. Define `type: 'x'` nodes with subtype `x` in a separate file
2. Use transform hooks first; avoid parser forks
3. Extend the renderer with `case 'x'` handling your subtypes
4. Add tests

### "Build a custom renderer" (e.g., React, terminal, LaTeX)

1. Import types from `litemarkup/ast`
2. Pattern-match on `node.type`
3. Include `case 'x'` switching on `node.x`, skip unknowns
4. Delegate to core renderer only if desired

### "Fix incorrect rendering"

1. Look at `src/html.ts` or the custom renderer used
2. Verify that the source AST is correct to rule out parser bug; write an AST test if needed
3. Write a failing renderer test, then fix
4. Re-run the suite

### "Fix a parser bug"

1. Look at `src/parser.ts`
2. Identify block vs inline stage
3. Write a failing test that checks the AST output, then fix
4. Re-run the suite

---

## Style

- See `.prettierrc.json`
- Follow the existing file's conventions
