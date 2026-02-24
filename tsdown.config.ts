import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      litemarkup: './src/litemarkup.ts',
      parser: './src/parser.ts',
      html: './src/html.ts',
      ast: './src/ast.ts',
      cli: './src/cli.ts',
    },
    format: ['esm'],
    unbundle: true,
    dts: true,
    clean: true,
  },
  {
    entry: {
      'litemarkup.min': './src/litemarkup.ts',
    },
    format: ['iife'],
    globalName: 'litemarkup',
    minify: true,
  },
])
