#!/usr/bin/env node

import { readFile } from 'node:fs'
import { convertToHtml } from './litemarkup'

export function runCli(args: string[], stdin: string): string {
  const allowUnsafeHtml = args.includes('--allow-unsafe-html')
  const markdownMode = args.includes('--markdown-mode')

  return convertToHtml(stdin, { allowUnsafeHtml, markdownMode })
}

readFile(0, 'utf8', (err, stdin) => {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }
  process.stdout.write(runCli(process.argv.slice(2), stdin))
})
