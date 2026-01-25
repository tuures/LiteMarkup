#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { convertToHtml } from './litemarkup'

const stdin = readFileSync(0, 'utf8')

console.log(convertToHtml(stdin))
