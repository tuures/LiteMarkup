#!/usr/bin/env node

import { readFile } from 'node:fs'
import { convertToHtml } from './litemarkup'

const args = process.argv.slice(2)
const allowUnsafeHtml = args.includes('--allow-unsafe-html')

readFile(0, 'utf8', (err, stdin) => {
  if (err) throw err
  process.stdout.write(convertToHtml(stdin, { allowUnsafeHtml }))
})
