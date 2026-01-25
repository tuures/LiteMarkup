import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      litemarkup: './src/litemarkup.ts',
      cli: './src/cli.ts',
    },
    format: ['esm'],
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
