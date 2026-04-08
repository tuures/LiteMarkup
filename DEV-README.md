# Development guide

## Commands

- `npm run build` — generate dist files
- `npm test` — run tests
- `npm test -- --coverage` — run tests with coverage report

## Architecture

The compiler has two stages:

1. **parser** (`src/parser.ts`) — regex-based recursive descent parser, produces AST
2. **htmlRenderer** (`src/html.ts`) — produces HTML string from the AST

AST node shapes live in `src/ast.ts`. Every node has a `type` field. Block nodes use `body` (for inline content) or `doc` (for nested blocks). Text content uses `txt`. AST is plain JSON-serializable data — no classes, functions, or circular references.

Parser and renderer are both stateless and side-effect free.

### Parser internals

Parser uses two rule types:

- `SimpleRule` — single regex match
- `LookaheadRule` — pre-match regex determines the main regex (used for lists)

Rules are matched in priority order; first match wins.

### Extension hooks

`transformBlock` and `transformInline` hooks allow AST modification without forking the parser. See `EXTENDING.md` for usage and conventions.

## Syntax description

See [LiteMarkup-syntax.lm](docs/LiteMarkup-syntax.lm) for the syntax description.
It should be kept in sync with this reference implementation.

## Regex development

[regex101.com](https://regex101.com) is great for developing the regexes.

Avoid backtracking — match as little as possible, but not too little.

## Tests

- **Snapshot tests** — verify output for various inputs
- **Fuzzy tests** — random input to catch parser failures

Add a failing test first for parser/renderer changes. Re-run the suite after changes.

## How to do a release

- Update CHANGELOG.md
- `npm run build`
- `npm version patch|minor|major`
- `git push --tags`
- `npm publish`
- Make release in GitHub
- Update demopage to use the new release
