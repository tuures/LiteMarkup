#!/usr/bin/env node

import { readFile } from 'node:fs'
import { convertToHtml } from './litemarkup'

const args = process.argv.slice(2)
const allowUnsafeHtml = args.includes('--allow-unsafe-html')

readFile(0, 'utf8', (err, stdin) => {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }
  process.stdout.write(convertToHtml(stdin, { allowUnsafeHtml }))
})
