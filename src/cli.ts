import fs from 'fs'

import { convertToHtml } from './litemarkup'

const stdin = fs.readFileSync(0, 'utf8')

console.log(convertToHtml(stdin))
