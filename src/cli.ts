#!/usr/bin/env node

import { readFile } from 'node:fs'
import { convertToHtml } from './litemarkup'

readFile(0, 'utf8', (err, stdin) => {
  if (err) throw err
  process.stdout.write(convertToHtml(stdin))
})
