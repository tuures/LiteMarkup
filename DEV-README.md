# Development

## Commands

- `npm run build` — generate dist files
- `npm test` — run tests
- `npm test -- --coverage` — run tests with coverage report

## Architecture

The compiler has two stages:

1. **parser** — regex-based recursive descent parser, produces AST
2. **htmlRenderer** — produces HTML string from the AST

Parser uses two rule types:

- `SimpleRule` — single regex match
- `LookaheadRule` — pre-match regex determines the main regex (used for lists)

Rules are matched in priority order; first match wins.

Extension points: `transformBlock` and `transformInline` hooks allow AST modification.

## Syntax description

See [LiteMarkup-syntax.lm](LiteMarkup-syntax.lm) for the syntax description.
It should be kept in sync with this reference implementation.

## Regex development

[regex101.com](https://regex101.com) is great for developing the regexes.

Avoid backtracking — match as little as possible, but not too little.

## Tests

- **Snapshot tests** — verify output for various inputs
- **Fuzzy tests** — random input to catch parser failures

## How to do release

- `npm run build`
- `npm version patch|minor|major`
- `npm publish` (updates version in `package.json` and creates a tag & commit)
- `git push --tags`
- Make release in GitHub
- Update demopage to use the new release
